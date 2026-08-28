/**
 * A read-only job description element: a heading plus its bullet list, or a
 * muted placeholder when the element has no content for this job.
 */
export function JdReadOnlySection({
  label,
  items,
}: {
  label: string;
  items?: string[];
}) {
  return (
    <div className="mb-6">
      <h4 className="font-semibold mb-3">{label}</h4>
      {items?.length ? (
        <ul className="space-y-2 text-sm list-disc list-inside">
          {items.map((text, index) => (
            <li key={index}>{text}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 italic">Not specified</p>
      )}
    </div>
  );
}
