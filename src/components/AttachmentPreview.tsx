import React from 'react';
import { X, FileText, Music, Video, Image } from 'lucide-react';
import { Button } from './ui/button';

export interface AttachmentFile {
  type: 'image' | 'audio' | 'video' | 'document';
  url: string;
  name: string;
  file: File;
}

interface AttachmentPreviewProps {
  attachments: AttachmentFile[];
  onRemove: (index: number) => void;
  onClear: () => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachments,
  onRemove,
  onClear
}) => {
  if (attachments.length === 0) return null;

  const getIcon = (type: AttachmentFile['type']) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="border border-border/50 rounded-lg p-3 mb-2 bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">
          {attachments.length} file{attachments.length > 1 ? 's' : ''} attached
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment, index) => (
          <div
            key={index}
            className="relative group"
          >
            {attachment.type === 'image' ? (
              <div className="relative">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="h-16 w-16 object-cover rounded-lg border border-border/50"
                />
                <button
                  onClick={() => onRemove(index)}
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 bg-background/50 border border-border/50 rounded-lg px-3 py-2">
                {getIcon(attachment.type)}
                <span className="text-xs truncate max-w-[100px]">{attachment.name}</span>
                <button
                  onClick={() => onRemove(index)}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttachmentPreview;
