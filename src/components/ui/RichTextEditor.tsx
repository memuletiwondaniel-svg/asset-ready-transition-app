import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Paperclip, 
  X,
  FileText,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ImageEditorDialog from '@/components/ui/ImageEditorDialog';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document';
  size: number;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  attachments?: Attachment[];
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  placeholder?: string;
  storageBucket?: string;
  storagePath?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  attachments = [],
  onAttachmentsChange,
  placeholder = 'Enter description...',
  storageBucket = 'pssr-attachments',
  storagePath = 'scope',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingImageSrc, setEditingImageSrc] = useState<string | null>(null);
  const [editingImageElement, setEditingImageElement] = useState<HTMLImageElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-2 cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 transition-all',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] px-3 py-2',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              handleImageUpload(file);
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        event.preventDefault();
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('image/')) {
            handleImageUpload(file);
          } else {
            handleDocumentUpload(file);
          }
        }
        return true;
      },
    },
  });

  // Attach click listener to images inside the editor
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        e.stopPropagation();
        const imgEl = target as HTMLImageElement;
        setEditingImageSrc(imgEl.src);
        setEditingImageElement(imgEl);
      }
    };

    editorElement.addEventListener('click', handleClick);
    return () => editorElement.removeEventListener('click', handleClick);
  }, [editor]);

  const handleImageEditorSave = useCallback(async (croppedDataUrl: string) => {
    if (!editor || !editingImageElement) return;

    // Upload the cropped image
    setIsUploading(true);
    try {
      const response = await fetch(croppedDataUrl);
      const blob = await response.blob();
      const fileName = `${Date.now()}-cropped.jpg`;
      const filePath = `${storagePath}/${fileName}`;

      const { error } = await supabase.storage
        .from(storageBucket)
        .upload(filePath, blob, { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        // Replace the old image src in editor HTML
        const oldSrc = editingImageElement.src;
        const currentHtml = editor.getHTML();
        const newHtml = currentHtml.replace(
          new RegExp(`src="${oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
          `src="${urlData.publicUrl}"`
        );
        editor.commands.setContent(newHtml);
        onChange(editor.getHTML());
        toast.success('Image updated');
      }
    } catch (error: any) {
      console.error('Error saving cropped image:', error);
      toast.error('Failed to save edited image');
    } finally {
      setIsUploading(false);
      setEditingImageSrc(null);
      setEditingImageElement(null);
    }
  }, [editor, editingImageElement, storageBucket, storagePath, onChange]);

  const handleImageUpload = async (file: File) => {
    if (!editor) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${storagePath}/${fileName}`;

      const { data, error } = await supabase.storage
        .from(storageBucket)
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        editor.chain().focus().setImage({ src: urlData.publicUrl }).run();
        toast.success('Image added');
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocumentUpload = async (file: File) => {
    if (!onAttachmentsChange) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${storagePath}/documents/${fileName}`;

      const { data, error } = await supabase.storage
        .from(storageBucket)
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        const newAttachment: Attachment = {
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: file.name,
          url: urlData.publicUrl,
          type: file.type.startsWith('image/') ? 'image' : 'document',
          size: file.size,
        };
        onAttachmentsChange([...attachments, newAttachment]);
        toast.success('Document attached');
      }
    } catch (error: any) {
      console.error('Document upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      } else {
        handleDocumentUpload(file);
      }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (attachmentId: string) => {
    if (!onAttachmentsChange) return;
    onAttachmentsChange(attachments.filter(a => a.id !== attachmentId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap p-2 border border-b-0 rounded-t-lg bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-muted' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-muted' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Paperclip className="h-4 w-4 mr-1" />
              <span className="text-xs">Attach</span>
            </>
          )}
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      
      {/* Editor */}
      <div className="border rounded-b-lg rounded-t-none -mt-3 bg-background">
        <EditorContent editor={editor} />
      </div>
      
      {/* Tip */}
      <p className="text-xs text-muted-foreground">
        Tip: You can paste or drag & drop images directly into the text area. Click on an image to crop or resize it.
      </p>
      
      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Attachments</Label>
          <div className="space-y-1">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm truncate">{attachment.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({formatFileSize(attachment.size)})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeAttachment(attachment.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Editor Dialog */}
      {editingImageSrc && (
        <ImageEditorDialog
          open={!!editingImageSrc}
          onClose={() => {
            setEditingImageSrc(null);
            setEditingImageElement(null);
          }}
          imageSrc={editingImageSrc}
          onSave={handleImageEditorSave}
        />
      )}
    </div>
  );
};

export default RichTextEditor;
