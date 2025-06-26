
export const handleContextAction = (action: string, person: any) => {
  switch (action) {
    case 'chat':
      window.open(`msteams:/l/chat/0/0?users=${person.email}`, '_blank');
      break;
    case 'email':
      window.open(`mailto:${person.email}`, '_blank');
      break;
    case 'copy':
      navigator.clipboard.writeText(person.email);
      break;
  }
};
