import { BranchId, money } from "@/lib/toto-data";
import { CourseDesignCard } from "@/components/ui/course-design-cards";

interface BranchCardProps {
  id: BranchId;
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
  vat: number;
  isSelected?: boolean;
  onClick: () => void;
  role?: string;
}

export function BranchCard({
  name,
  revenue,
  expenses,
  profit,
  vat,
  isSelected,
  onClick,
  role,
}: BranchCardProps) {
  return (
    <CourseDesignCard
      title={name}
      {...(role === undefined ? {} : { role })}
      {...(isSelected === undefined ? {} : { isSelected })}
      onClick={onClick}
      metrics={[
        { label: "Revenue", value: money(revenue) },
        { label: "Expenses", value: money(expenses) },
        { label: "Profit", value: money(profit), accent: profit >= 0 },
        { label: "VAT", value: money(vat) },
      ]}
    />
  );
}
