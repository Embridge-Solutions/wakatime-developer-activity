"use client";

import React, { useRef } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Dialog, DialogOverlay, DialogPortal } from "../ui/dialog";
import RecordedBy, { modeFromTitle, RECORDED_BY_LABEL, RecordMode, useLoginUserName } from "../common/RecordedBy";
import {
  Check,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DialogVariant =
  | "default"
  | "danger"
  | "warning"
  | "success"
  | "info";
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";
export type DialogPlacement = "center" | "side";

export interface DialogFooterAction {
  /** Button label */
  label: string;
  /** Button type  – defaults to 'button' */
  type?: "button" | "submit" | "reset";
  /** Visual style – defaults to 'default' (primary action color) */
  variant?:
  | "default"
  | "outline"
  | "ghost"
  | "link"
  | "destructive"
  | "secondary";
  /** Extra class names */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Auto-close the dialog after the click */
  closeOnClick?: boolean;
  /** Show spinner and disable the button */
  loading?: boolean;
  /** Completely disable the button */
  disabled?: boolean;
  /** Optional icon rendered next to the label */
  icon?: React.ReactNode;
  /** Put the icon after the label (e.g. an arrow on "Continue") */
  iconRight?: boolean;
}

export interface DialogComponentProps {
  // ── Visibility ──────────────────────────────────────────────────────────────
  /** Whether the dialog is open */
  showDialog: boolean;
  /** Setter to open / close the dialog */
  setShowDialog: (open: boolean) => void;

  // ── Content ─────────────────────────────────────────────────────────────────
  /** Dialog heading */
  title?: string;
  /** Short description rendered below the title inside the header */
  description?: React.ReactNode;
  /** Small uppercase label above the title, e.g. "Scope 1 · Stationary combustion" */
  eyebrow?: React.ReactNode;
  /** Icon rendered to the left of the title. `null` hides the variant icon. */
  icon?: React.ReactNode;
  /** Body content */
  children?: React.ReactNode;

  // ── Variant, Size & Placement ───────────────────────────────────────────────
  /**
   * Accent of the dialog (eyebrow dot + header icon).
   * 'default' uses the action color; the others use the status colors.
   */
  variant?: DialogVariant;
  /**
   * Width preset.
   * center → sm 400px · md 480px · lg 672px · xl 70vw · full 90vw
   * side   → sm 420px · md 480px · lg 600px · xl 760px · full 1040px
   */
  size?: DialogSize;
  /**
   * 'side' — panel that slides in from the right (default for forms, `asForm`).
   * 'center' — classic dialog (default for viewers: tables, charts, details).
   */
  placement?: DialogPlacement;

  // ── Footer ──────────────────────────────────────────────────────────────────
  /**
   * Array of action buttons rendered in the dialog footer.
   * When omitted (and there is no Save button) the footer is not rendered.
   */
  footerActions?: DialogFooterAction[];
  /** Left side of the footer. Overrides the default "Recorded as" stamp. */
  footerMeta?: React.ReactNode;
  /**
   * Footer stamp: profile initials + "<label> <name> · <date>" (label from `mode`:
   * Created by / Updated by / Recorded as). Shown on every form modal.
   * Pass the live value of the form's "Created by / Updated by" input here and
   * the stamp follows every keystroke; omit it to show the logged-in user.
   */
  recordedByName?: string;
  /**
   * Forms without their own "Created By / Updated By" input get one added at
   * the end of the body (prefilled with the logged-in user). The footer follows
   * it; read the value here if the API should receive it.
   */
  onRecordedByChange?: (name: string) => void;
  /** Custom wording for the stamp ("Approved by"…); wins over `mode`. */
  recordedBy?: string;
  /** Hide the stamp. It is shown on every form modal (`asForm` / `showSaveButton`) by default. */
  hideRecordedBy?: boolean;
  /**
   * 'create' → footer says "Created by", 'update' → "Updated by".
   * When omitted it is guessed from the title ("Create…", "Update…").
   */
  mode?: RecordMode;
  /** Show the close (×) button in the header */
  showCloseButton?: boolean;

  // ── Form support ─────────────────────────────────────────────────────────────
  /**
   * Wrap the dialog body + footer inside a <form> element.
   * Pair with a footer action of type='submit' or `showSaveButton`.
   */
  asForm?: boolean;
  /** Called when the wrapping form is submitted. Can be an async function to auto-track loading state. */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => any;

  // ── Behaviour ────────────────────────────────────────────────────────────────
  /**
   * Allow closing by clicking outside or pressing Esc.
   * Defaults to true.
   */
  dismissible?: boolean;

  // ── Overrides ────────────────────────────────────────────────────────────────
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  /** Adds Cancel + Save to the footer. */
  showSaveButton?: boolean;
  /** Primary save handler when not using asForm. Auto-tracks if returning a Promise. */
  onSave?: () => any;
  /** Shows spinner on the Save button and locks it from being clicked */
  isSaving?: boolean;
  /** When truthy, re-enables the Save button so the user can retry after an error */
  saveError?: boolean | string | null;
  /** Custom label for the Save button */
  saveButtonLabel?: string;
  /** Custom className for the Save button */
  saveButtonBg?: string;
  /** Label of the Cancel button shown next to Save */
  cancelLabel?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VARIANT_TONE: Record<DialogVariant, string | undefined> = {
  default: undefined,
  danger: "danger",
  warning: "warning",
  success: "success",
  info: "info",
};

const VARIANT_ICON: Record<DialogVariant, React.ReactNode> = {
  default: null,
  danger: <AlertTriangle className="w-[18px] h-[18px]" />,
  warning: <AlertCircle className="w-[18px] h-[18px]" />,
  success: <CheckCircle className="w-[18px] h-[18px]" />,
  info: <Info className="w-[18px] h-[18px]" />,
};

const CENTER_MAX_WIDTH: Record<DialogSize, string> = {
  sm: "400px",
  md: "480px",
  lg: "672px",
  xl: "70vw",
  full: "90vw",
};

const SIDE_WIDTH: Record<DialogSize, string> = {
  sm: "420px",
  md: "480px",
  lg: "600px",
  xl: "760px",
  full: "1040px",
};

const BUTTON_CLASS: Record<NonNullable<DialogFooterAction["variant"]>, string> = {
  default: "ui-btn-primary",
  destructive: "ui-btn-danger",
  outline: "ui-btn-secondary",
  secondary: "ui-btn-secondary",
  ghost: "ui-btn-ghost",
  link: "ui-btn-ghost",
};

// ─── Footer Button ─────────────────────────────────────────────────────────────

interface FooterBtnProps {
  action: DialogFooterAction;
  onClose: () => void;
}

const FooterBtn = ({ action, onClose }: FooterBtnProps) => {
  const handleClick = () => {
    action.onClick?.();
    if (action.closeOnClick) onClose();
  };

  return (
    <button
      type={action.type ?? "button"}
      disabled={action.disabled || action.loading}
      onClick={action.type === "submit" ? undefined : handleClick}
      className={cn(
        "ui-btn min-w-[90px]",
        BUTTON_CLASS[action.variant ?? "default"],
        action.className,
      )}
    >
      {action.loading ? <Loader2 className="animate-spin" /> : !action.iconRight && action.icon}
      {action.label}
      {!action.loading && action.iconRight && action.icon}
    </button>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * The standard modal of the app. One look for every center dialog and side
 * panel — styles live in app/globals.css (".ui-modal*").
 */
const DialogComponent = ({
  // Visibility
  showDialog,
  setShowDialog,
  // Content
  title,
  description,
  eyebrow,
  icon,
  children,
  // Variant, Size & Placement
  variant = "default",
  size = "full",
  placement: placementProp,
  // Footer
  footerActions,
  footerMeta,
  recordedByName,
  onRecordedByChange,
  recordedBy,
  hideRecordedBy = false,
  mode,
  showCloseButton = true,
  // Form
  asForm = false,
  onSubmit,
  // Behaviour
  dismissible = true,
  // Overrides
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  showSaveButton = false,
  onSave,
  isSaving = false,
  saveButtonLabel = "Save",
  saveButtonBg,
  cancelLabel = "Cancel",
}: DialogComponentProps) => {
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const [internalIsSaving, setInternalIsSaving] = React.useState(false);
  const combinedIsSaving = isSaving || internalIsSaving;

  // Built-in "Created By / Updated By" field for forms that don't have one.
  // null = untouched → shows the logged-in user. Reset each time the modal opens.
  const loginName = useLoginUserName();
  const [byName, setByName] = React.useState<string | null>(null);
  const [wasOpen, setWasOpen] = React.useState(showDialog);
  if (showDialog !== wasOpen) {
    setWasOpen(showDialog);
    if (showDialog) setByName(null);
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !dismissible) return;
    setShowDialog(open);
  };

  const close = () => setShowDialog(false);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!onSubmit) {
      e.preventDefault();
      return;
    }

    try {
      setInternalIsSaving(true);
      await onSubmit(e);
    } finally {
      setInternalIsSaving(false);
    }
  };

  const handleSaveClick = async () => {
    if (combinedIsSaving) return;

    if (asForm) {
      submitBtnRef.current?.click();
    } else if (onSave) {
      try {
        setInternalIsSaving(true);
        await onSave();
      } finally {
        setInternalIsSaving(false);
      }
    }
  };

  const placement: DialogPlacement = placementProp ?? (asForm ? "side" : "center");
  const resolvedIcon = icon === undefined ? VARIANT_ICON[variant] : icon;
  const tone = VARIANT_TONE[variant];
  const hasActions = (footerActions && footerActions.length > 0) || showSaveButton;
  const recordMode = mode ?? modeFromTitle(title);
  const isFormModal = asForm || showSaveButton;
  // Own field when the page didn't pass its input's value
  const showByField = !hideRecordedBy && !footerMeta && isFormModal && recordedByName === undefined;
  const byValue = byName ?? loginName;
  const byLabel = recordedBy ?? RECORDED_BY_LABEL[recordMode ?? "default"];
  const meta =
    footerMeta ??
    (!hideRecordedBy && (recordedByName !== undefined || isFormModal) ? (
      <RecordedBy
        name={recordedByName ?? byValue}
        label={recordedBy}
        mode={recordMode}
      />
    ) : null);
  const hasFooter = hasActions || Boolean(meta);

  // ── Inner content (body + optional footer) ───────────────────────────────
  const innerContent = (
    <>
      <div className={cn("ui-modal-body", bodyClassName)}>
        {children}
        {showByField && (
          <div className="ui-field mt-5 border-t border-slate-100 pt-4">
            <label htmlFor="dlg-recorded-by" className="ui-label">
              <span>{byLabel.replace(/\bby\b/, "By")}</span>
            </label>
            <input
              id="dlg-recorded-by"
              className="ui-input"
              value={byValue}
              placeholder="Your name"
              onChange={(e) => {
                setByName(e.target.value);
                onRecordedByChange?.(e.target.value);
              }}
            />
          </div>
        )}
      </div>

      {hasFooter && (
        <div className={cn("ui-modal-footer", footerClassName)}>
          {meta && <div className="ui-modal-footer-meta">{meta}</div>}
          {footerActions?.map((action, idx) => (
            <FooterBtn key={idx} action={action} onClose={close} />
          ))}
          {showSaveButton && (
            <>
              {!footerActions?.length && (
                <button type="button" onClick={close} className="ui-btn ui-btn-ghost">
                  {cancelLabel}
                </button>
              )}
              <button
                type="button"
                disabled={combinedIsSaving}
                onClick={handleSaveClick}
                className={cn("ui-btn ui-btn-primary min-w-[110px]", saveButtonBg)}
              >
                {combinedIsSaving ? <Loader2 className="animate-spin" /> : <Check />}
                {combinedIsSaving ? "Saving…" : saveButtonLabel}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );

  const sizeStyle: React.CSSProperties =
    placement === "side"
      ? ({ "--modal-side-width": SIDE_WIDTH[size] } as React.CSSProperties)
      : { maxWidth: CENTER_MAX_WIDTH[size] };

  return (
    <Dialog open={showDialog} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          data-tone={tone}
          aria-describedby={undefined}
          onPointerDownOutside={(e) => {
            if (!dismissible) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (!dismissible) e.preventDefault();
          }}
          style={sizeStyle}
          className={cn(
            "ui-modal",
            placement === "side" ? "ui-modal--side" : "ui-modal--center",
            contentClassName,
          )}
        >
          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className={cn("ui-modal-header", headerClassName)}>
            <div className="flex items-start gap-3 min-w-0">
              {resolvedIcon && (
                <span
                  className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    color: "var(--tone, var(--action))",
                    background: "color-mix(in oklab, var(--tone, var(--action)) 10%, white)",
                  }}
                >
                  {resolvedIcon}
                </span>
              )}
              <div className="min-w-0">
                {eyebrow && <div className="ui-modal-eyebrow">{eyebrow}</div>}
                <DialogPrimitive.Title className="ui-modal-title truncate">
                  {title}
                </DialogPrimitive.Title>
                {description && <p className="ui-modal-desc">{description}</p>}
              </div>
            </div>

            {showCloseButton && (
              <DialogPrimitive.Close
                type="button"
                title="Close"
                aria-label="Close dialog"
                onClick={close}
                className="ui-modal-close -mr-1.5 -mt-0.5"
              >
                <X className="w-[18px] h-[18px]" />
              </DialogPrimitive.Close>
            )}
          </div>

          {/* ── Body + Footer (optionally wrapped in a <form>) ───────────── */}
          {asForm ? (
            <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0">
              {innerContent}
              <button type="submit" className="hidden" ref={submitBtnRef} />
            </form>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">{innerContent}</div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default DialogComponent;
