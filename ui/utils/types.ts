import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { SelectOption } from "@/components/common/SearchableSelect";

export interface MenuItem {
  icon?: React.ElementType<{ className?: string }>;
  label: string;
  scopeId?: number;
  path: string;
  /** Scope page key used by useScopes() to control visibility.
   *  Leave undefined to always show the item (e.g. Dashboard). */
  access?: string;
  subTabs?: MenuItem[];
  subPaths?: string[];
}

export interface ProfileMenuItems {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  navigation?: boolean;
}

export interface InputComponentInterface {
  label?: string;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
  name: string;
  value: string | number;
  className?: string;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  labelClassName?: string;
}


export interface SelectComponentInterface {
  label: string;
  name: string;
  value: string;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  className?: string;
  handleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  labelClassName?: string;
}

export interface FileUploadComponentProps {
  label: string;
  name: string;
  value?: string;
  handleChange: (file: File | null, name: string) => void;
  required?: boolean;
  className?: string;
  accept?: string; // example: ".pdf,.jpg,.png"
}

export interface InputGroupComponentInterface {
  label?: string;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
  name: string;
  value: string;
  className?: string;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  handleIconClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  iconView?: boolean;
}

export interface ButtonCompInterface {
  type: "button" | "submit" | "reset";
  variant:
  | "default"
  | "outline"
  | "ghost"
  | "link"
  | "destructive"
  | "secondary";
  className?: string;
  /** Optional click handler – safe to omit (e.g. submit buttons inside a <form>) */
  handleClick?: () => void;
  text: string | React.ReactNode;
  placeholder?: string;
}



export interface GaugeChartInterface {
  value: number; // 0-100
  label: string;
  textColor?: string;
  width?: number;
  className?: string;
  showValue?: boolean;
  maxValue?: number; // For time-based gauges (e.g., hours)
  unit?: string;
}

export interface MonthlyCalendarDataInterface {
  date: number;
  productionQty: number;
  rejectionQty: number;
}

export interface MonthlyCalendarInterface {
  productionData?: ProductionDataInterface[];
  className?: string;
  title?: string;
}

export interface CalendarInterface {
  productionData?: ProductionDataInterface[];
  weekly?: boolean;
  monthly?: boolean;
  className?: string;
  title?: string;
}

export interface WeeklyCalendarInterface {
  productionData?: ProductionDataInterface[];
  className?: string;
  title?: string;
}

export interface IdleTimeRecordInterface {
  startTime: string;
  endTime: string;
  duration: string;
  reason: string;
  runningProduct: string;
}

export interface IdleTimeParetoDataInterface {
  reason: string;
  value: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface ParetoDataInterface {
  reason: string;
  hour?: string;
  duration?: number;
  value: number;
  percentage?: number;
  cumulativePercentage?: number;
}

export interface ParetoChartInterface {
  data: ParetoDataInterface[];
  title?: string;
  subTitle?: string;
  height?: number;
  xAxisTitleText?: string;
  yAxisTitleText?: string;
}

export interface ProductionDataInterface {
  date: string; // Date in format '2025-11-15'
  productionQty: number;
  rejectionQty: number;
}

export interface TableColumn<T = any> {
  key: string;
  label: string;
  icon?: LucideIcon;
  render?: (value: any, row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

export interface TableAction<T = any> {
  label: string;
  icon?: LucideIcon;
  onClick: (row: T) => void;
  className?: string;
  variant?: "default" | "outline" | "destructive" | "ghost" | "link";
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];

  // Feature toggles
  showSearch?: boolean;
  showFilter?: boolean;
  showExport?: boolean;
  showPrint?: boolean;
  showColumnToggle?: boolean;
  showActions?: boolean;
  showAddRow?: boolean;
  showPagination?: boolean;

  // Search & Filter
  searchPlaceholder?: string;
  searchKeys?: string[];

  // Pagination
  pageSize?: number;
  pageSizeOptions?: number[];

  // Callbacks
  onAddRow?: () => void;
  onExport?: (data: T[]) => void;
  onPrint?: (data: T[]) => void;

  // Styling
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

export interface AuthWrapperInterface {
  children: React.ReactNode;
  required?: boolean; // If true, redirects to login if not authenticated. If false, allows access (optional auth)
  redirectTo?: string;
  fallback?: React.ReactNode; // What to show while checking auth or if not authenticated (for optional)
}

export interface UserDataInterface {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  lastLoginAt?: string | null;
  loginAttempts?: number;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
  avatar?: string | null;
}

export type DialogVariant =
  | "default"
  | "danger"
  | "warning"
  | "info"
  | "success";

export interface DialogFooterAction {
  label: string;
  type?: "button" | "submit" | "reset";
  variant?: ButtonCompInterface["variant"];
  className?: string;
  onClick?: () => void;
  /** If true the button will close the dialog automatically */
  closeOnClick?: boolean;
  /** Show a loading spinner & disable the button */
  loading?: boolean;
}

export interface DialogComponentInterface {
  /** Controls dialog open / close state */
  open: boolean;
  /** Called when the dialog open state should change */
  onOpenChange: (open: boolean) => void;
  /** Dialog heading text */
  title?: string;
  /** Optional short description rendered below the title */
  description?: string;
  /** Visual variant – drives the header accent colour */
  variant?: DialogVariant;
  /** Content rendered inside the dialog body */
  children?: React.ReactNode;
  /** Array of footer action buttons */
  footerActions?: DialogFooterAction[];
  /** Extra class applied to the DialogContent wrapper */
  contentClassName?: string;
  /** Extra class applied to the DialogHeader */
  headerClassName?: string;
  /** Extra class applied to the body div */
  bodyClassName?: string;
  /** Extra class applied to the DialogFooter */
  footerClassName?: string;
  /** Whether the dialog can be dismissed by clicking outside or pressing Esc */
  dismissible?: boolean;
  /** Show a divider line between header and body */
  showHeaderDivider?: boolean;
  /** Show a divider line between body and footer */
  showFooterDivider?: boolean;
  /** Icon element rendered left of the title */
  icon?: React.ReactNode;
  /** Wrap body content in a <form> – useful for submit dialogs */
  asForm?: boolean;
  /** Called when the form (asForm) is submitted */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export type GRNRow = {
  id: number;
  partToolId: number;
  partNo: string;
  partDescription: string;
  toolSINo: string;
  qtyReceived: number;
  supplierCode: string;
  supplierName: string;
  receiptDocumentRefNo: string;
  receiptDocDate: string;
  uploadedBy: string;
  uploadedDate: string;
  documentUrl: string;
};

export type ActivityRow = GRNRow & {
  poStatus: string | null;
  expectedEndDate: string | null;
  daysToExpected: number | null;
  urgencyLevel: "critical" | "warning" | "normal" | "overdue" | "na";
  toolSlNo?: string;
  issuedSupplier?: string;
  balanceLife?: number;
  receiptSupplier?: string;
  monthlyDemand?: number;
  receicvedQty?: number;
  toolLife?: number;
  receivedQty?: number;
  expectToInitiatingPO?: string;
  poInitiateDate?: string;
  lastRevisedBy?: string;
  lastRevisedDate?: string;
  productionStartDate?: string;
  rejectionPercentage?: number;
  lastRecdDate?: string;
};

export interface OverviewDashboardResponse {
  success: boolean;
  msg: string;
  data: {
    filterType: "month" | "year";
    year: number;
    month: number | null;
    kpis: any[];
    trends: any[];
    electricityMix: any[];
    transportMix: any[];
  };
  overview: {
    electotalEmission: number
    kwhrUsed: number
    month: string
    transtotalEmission: number
    year: number
  },
  electricity: {
    amount: number
    kwhrUsed: number
    month: string
    source: string
    totalEmission: number
    year: number
  },
  transport: {
    avgKm: number
    mode: string
    month: string
    tons: number
    totalEmission: number
    year: number
  },
}

export interface MachineStatusDataInterface {
  id: string;
  name: string;
  status: string;
  connectionStatus: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  productionQty: number;
  rejectionQty: number;
}

