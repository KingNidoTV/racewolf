import type { CatalogEntry } from "../../data/catalogTypes";
import { EnduranceMenuSelect } from "./EnduranceMenuSelect";

interface Props {
  options: CatalogEntry[];
  valueId: string;
  placeholder: string;
  onChange: (id: string, label: string) => void;
}

export function CatalogSelect({
  options,
  valueId,
  placeholder,
  onChange,
}: Props) {
  const sorted = [...options].sort((a, b) =>
    a.label.localeCompare(b.label, "fr"),
  );

  return (
    <EnduranceMenuSelect
      value={valueId}
      placeholder={placeholder}
      options={sorted.map((entry) => ({
        value: entry.id,
        label: entry.label,
      }))}
      onChange={(id) => {
        const entry = options.find((o) => o.id === id);
        onChange(id, entry?.label ?? "");
      }}
    />
  );
}
