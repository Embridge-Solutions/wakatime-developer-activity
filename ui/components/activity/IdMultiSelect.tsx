'use client';

import MultiSelect from '@/components/common/multiselect';

/** Multi-select over numeric ids (team members, a user's teams) on top of the shared MultiSelect. */
export default function IdMultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: { id: number; label: string }[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
}) {
  const labelOf = (id: string) => options.find((o) => String(o.id) === id)?.label ?? id;
  return (
    <MultiSelect
      label={label}
      options={options.map((o) => String(o.id))}
      selected={value.map(String)}
      onChange={(opt) => {
        const id = Number(opt);
        onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
      }}
      renderSelected={labelOf}
      renderOption={labelOf}
      getSearchLabel={labelOf}
      showSearch
      placeholder={placeholder}
    />
  );
}
