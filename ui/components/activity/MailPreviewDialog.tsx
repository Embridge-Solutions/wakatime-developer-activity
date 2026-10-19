'use client';

import DialogComponent from '@/components/layout/dialogComponent';

/** Shows a mail exactly as it is sent (sandboxed iframe — the mail's HTML can't run scripts). */
export default function MailPreviewDialog({
  mail,
  onClose,
}: {
  mail: { subject: string; html: string } | null;
  onClose: () => void;
}) {
  return (
    <DialogComponent
      showDialog={!!mail}
      setShowDialog={(open) => !open && onClose()}
      placement="center"
      size="lg"
      icon={null}
      eyebrow="Mail preview"
      title={mail?.subject ?? ''}
      bodyClassName="!p-0"
      footerActions={[{ label: 'Close', variant: 'ghost', onClick: onClose }]}
    >
      {mail && <iframe title="Mail preview" sandbox="" srcDoc={mail.html} className="h-[70vh] w-full border-0 bg-[#f4f5f8]" />}
    </DialogComponent>
  );
}
