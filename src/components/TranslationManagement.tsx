import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Languages, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { useChecklistItems } from '@/hooks/useChecklistItems';
import { useChecklistCategories } from '@/hooks/useChecklistCategories';
import { useChecklistTopics } from '@/hooks/useChecklistTopics';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TranslationManagementProps {
  onBack: () => void;
  translations?: any;
}

const TranslationManagement: React.FC<TranslationManagementProps> = ({ onBack, translations }) => {
  const t = translations || {
    loading: 'Loading...',
    autoTranslate: 'Auto-Translate All',
    translating: 'Translating',
    success: 'Success',
    error: 'Error',
    translationComplete: 'Translation Complete',
    itemsTranslated: 'items translated successfully',
    translationFailed: 'Translation failed',
    noItems: 'No items found to translate'
  };

  const [activeTab, setActiveTab] = useState('items');
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  const { toast } = useToast();
  const { data: checklistItems = [], isLoading: itemsLoading } = useChecklistItems();
  const { data: categories = [], isLoading: categoriesLoading } = useChecklistCategories();
  const { data: topics = [], isLoading: topicsLoading } = useChecklistTopics();

  const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: { text, targetLanguage, sourceLanguage: 'en' }
      });

      if (error) throw error;
      return data.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  };

  const translateItems = async () => {
    if (!checklistItems || checklistItems.length === 0) {
      toast({
        title: t.noItems,
        variant: "destructive"
      });
      return;
    }

    setIsTranslating(true);
    setProgress({ current: 0, total: checklistItems.length });
    
    const languages = ['ar', 'fr', 'ms', 'ru'];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < checklistItems.length; i++) {
        const item = checklistItems[i];
        setProgress({ current: i + 1, total: checklistItems.length });

        try {
          const translations: any = {};

          // Translate description to all languages
          for (const lang of languages) {
            const translatedDescription = await translateText(item.description, lang);
            translations[lang] = { description: translatedDescription };
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          // Update the item with translations
          const { error } = await supabase
            .from('checklist_items')
            .update({ translations })
            .eq('category_ref_id', item.category_ref_id);

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Failed to translate item ${item.category_ref_id}:`, error);
          errorCount++;
        }
      }

      toast({
        title: t.translationComplete,
        description: `${successCount} ${t.itemsTranslated}${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: t.translationFailed,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const translateCategories = async () => {
    if (!categories || categories.length === 0) {
      toast({
        title: t.noItems,
        variant: "destructive"
      });
      return;
    }

    setIsTranslating(true);
    setProgress({ current: 0, total: categories.length });
    
    const languages = ['ar', 'fr', 'ms', 'ru'];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        setProgress({ current: i + 1, total: categories.length });

        try {
          const translations: any = {};

          for (const lang of languages) {
            const translatedName = await translateText(category.name, lang);
            const translatedDesc = category.description 
              ? await translateText(category.description, lang)
              : '';
            
            translations[lang] = { 
              name: translatedName,
              description: translatedDesc
            };
            
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          const { error } = await supabase
            .from('checklist_categories')
            .update({ translations })
            .eq('id', category.id);

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Failed to translate category ${category.id}:`, error);
          errorCount++;
        }
      }

      toast({
        title: t.translationComplete,
        description: `${successCount} categories ${t.itemsTranslated}${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: t.translationFailed,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const translateTopics = async () => {
    if (!topics || topics.length === 0) {
      toast({
        title: t.noItems,
        variant: "destructive"
      });
      return;
    }

    setIsTranslating(true);
    setProgress({ current: 0, total: topics.length });
    
    const languages = ['ar', 'fr', 'ms', 'ru'];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        setProgress({ current: i + 1, total: topics.length });

        try {
          const translations: any = {};

          for (const lang of languages) {
            const translatedName = await translateText(topic.name, lang);
            const translatedDesc = topic.description 
              ? await translateText(topic.description, lang)
              : '';
            
            translations[lang] = { 
              name: translatedName,
              description: translatedDesc
            };
            
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          const { error } = await supabase
            .from('checklist_topics')
            .update({ translations })
            .eq('id', topic.id);

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Failed to translate topic ${topic.id}:`, error);
          errorCount++;
        }
      }

      toast({
        title: t.translationComplete,
        description: `${successCount} topics ${t.itemsTranslated}${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: t.translationFailed,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Languages className="h-6 w-6 text-primary" />
            Translation Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically translate checklist content to multiple languages using AI
          </p>
        </div>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Auto-Translation
          </CardTitle>
          <CardDescription>
            Translate all content to Arabic, French, Malay, and Russian using AI-powered translation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Badge variant="secondary">Arabic (العربية)</Badge>
            <Badge variant="secondary">French (Français)</Badge>
            <Badge variant="secondary">Malay (Bahasa Melayu)</Badge>
            <Badge variant="secondary">Russian (Русский)</Badge>
          </div>
          
          {isTranslating && (
            <div className="mb-4 p-4 bg-background rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Translation Progress</span>
                <span className="text-sm text-muted-foreground">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="items">Checklist Items</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="topics">Topics</TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {itemsLoading ? t.loading : `${checklistItems.length} items ready to translate`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This will translate all checklist item descriptions
                  </p>
                </div>
                <Button 
                  onClick={translateItems} 
                  disabled={isTranslating || itemsLoading}
                  className="gap-2"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.translating}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {t.autoTranslate}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {categoriesLoading ? t.loading : `${categories.length} categories ready to translate`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This will translate all category names and descriptions
                  </p>
                </div>
                <Button 
                  onClick={translateCategories} 
                  disabled={isTranslating || categoriesLoading}
                  className="gap-2"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.translating}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {t.autoTranslate}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="topics" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {topicsLoading ? t.loading : `${topics.length} topics ready to translate`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This will translate all topic names and descriptions
                  </p>
                </div>
                <Button 
                  onClick={translateTopics} 
                  disabled={isTranslating || topicsLoading}
                  className="gap-2"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.translating}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {t.autoTranslate}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Translation Status</CardTitle>
          <CardDescription>Overview of translation coverage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Checklist Items</span>
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Ready for translation
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Categories</span>
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Ready for translation
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Topics</span>
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Ready for translation
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationManagement;