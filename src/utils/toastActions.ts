import { toast as sonnerToast } from 'sonner';

export const actions = {
  vote: {
    success: () => sonnerToast.success('Vote cast successfully', {
      description: 'Your vote has been recorded anonymously.',
    }),
    error: (msg?: string) => sonnerToast.error('Vote failed', {
      description: msg || 'Please try again.',
    }),
  },
  message: {
    sent: () => sonnerToast.success('Message sent', {
      description: 'Your encrypted message has been delivered.',
    }),
    error: (msg?: string) => sonnerToast.error('Message failed', {
      description: msg || 'Could not send message.',
    }),
  },
  profile: {
    saved: () => sonnerToast.success('Profile updated', {
      description: 'Your changes have been saved.',
    }),
    error: (msg?: string) => sonnerToast.error('Update failed', {
      description: msg || 'Could not save changes.',
    }),
  },
  proposal: {
    created: () => sonnerToast.success('Proposal submitted', {
      description: 'Your proposal is now under review.',
    }),
    error: (msg?: string) => sonnerToast.error('Submission failed', {
      description: msg || 'Please try again.',
    }),
  },
  connection: {
    chatConnected: () => sonnerToast.success('Connected to encrypted chat', {
      description: 'Your session is secure.',
    }),
    chatDisconnected: () => sonnerToast.info('Disconnected', {
      description: 'Chat session ended. Messages wiped.',
    }),
  },
  error: {
    generic: (msg?: string) => sonnerToast.error('Something went wrong', {
      description: msg || 'Please try again later.',
    }),
    network: () => sonnerToast.error('Network error', {
      description: 'Check your connection and retry.',
    }),
  },
};
