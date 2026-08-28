/**
 * Parsing and labelling for the Emplify job description elements.
 *
 * Everything beyond the position summary and the essential job duties is stored
 * as a single un-parsed text blob in `job_descriptions.other_job_description`.
 * The blob is a flat list of sections: a bare header line followed by "•"
 * bullets, with each bullet carrying a trailing "Required" / "Preferred" marker
 * that decides whether it is a REQUIRED or a DESIRED item.
 */

export interface JobDescriptionSections {
  educationRequired: string[];
  educationDesired: string[];
  experienceRequired: string[];
  experienceDesired: string[];
  certificationRequired: string[];
  certificationDesired: string[];
  environmentalConditions: string[];
  physicalRequirements: string[];
}

/** Labels for the two elements that remain editable and tracked. */
export const JD_LABELS = {
  positionSummary: "Position Summary",
  essentialFunctions: "Essential Job Duties_Major Responsibilities",
} as const;

/** The read-only elements, in the order they must be displayed. */
export const JD_READONLY_SECTIONS: ReadonlyArray<{
  key: keyof JobDescriptionSections;
  label: string;
}> = [
  { key: "educationRequired", label: "Education REQUIRED" },
  { key: "educationDesired", label: "Education DESIRED" },
  { key: "experienceRequired", label: "Experience REQUIRED" },
  { key: "experienceDesired", label: "Experience DESIRED" },
  {
    key: "certificationRequired",
    label: "Certification Registration_Licensure REQUIRED",
  },
  {
    key: "certificationDesired",
    label: "Certification Registration_Licensure DESIRED",
  },
  { key: "environmentalConditions", label: "Environmental Conditions" },
  {
    key: "physicalRequirements",
    label: "Physical Requirements/Demands of the Position",
  },
];

export function emptyJobDescriptionSections(): JobDescriptionSections {
  return {
    educationRequired: [],
    educationDesired: [],
    experienceRequired: [],
    experienceDesired: [],
    certificationRequired: [],
    certificationDesired: [],
    environmentalConditions: [],
    physicalRequirements: [],
  };
}

/**
 * Sections we split into REQUIRED / DESIRED, plus the two flat sections that
 * have no data today. Headers not listed here (Knowledge Skills & Abilities,
 * Field of Study, Additional Licenses and Certifications) are recognised as
 * headers so their bullets are skipped rather than absorbed by the section
 * above them.
 */
type SplitBucket = "education" | "experience" | "certification";
type FlatBucket = "environmentalConditions" | "physicalRequirements";
type Bucket = SplitBucket | FlatBucket | "ignored";

const BUCKET_BY_HEADER: Record<string, Bucket> = {
  "education": "education",
  "experience": "experience",
  "licenses and certifications": "certification",
  "certification registration_licensure": "certification",
  "environmental conditions": "environmentalConditions",
  "physical requirements": "physicalRequirements",
  "physical demands": "physicalRequirements",
  "physical requirements/demands": "physicalRequirements",
  "physical requirements/demands of the position": "physicalRequirements",
  // Recognised but deliberately not displayed.
  "knowledge, skills, and abilities": "ignored",
  "knowledge, skills and abilities": "ignored",
  "field of study": "ignored",
  "additional licenses and certifications": "ignored",
};

const BULLET_PREFIX = /^[•·●▪‣\-*\s]+/;
const MARKER = /(?:\s*[-–—]\s*|\s+)(required|preferred|desired)\s*$/i;
const EMPTY_ITEM = /^(n\/?a|none|tbd)[.\s]*$/i;

function normalizeHeader(line: string): string {
  return line.trim().toLowerCase().replace(/\s+/g, " ").replace(/:$/, "");
}

function isBullet(line: string): boolean {
  return /^[•·●▪‣]/.test(line.trim());
}

/**
 * Parses the `other_job_description` blob into the displayed elements.
 * Always returns a full object, so callers never have to null-check a section.
 */
export function parseJobDescriptionSections(
  blob?: string | null
): JobDescriptionSections {
  const sections = emptyJobDescriptionSections();
  if (!blob || !blob.trim()) return sections;

  // Raw bullets per bucket, before the REQUIRED/DESIRED marker is stripped.
  const raw: Record<SplitBucket | FlatBucket, string[]> = {
    education: [],
    experience: [],
    certification: [],
    environmentalConditions: [],
    physicalRequirements: [],
  };

  let bucket: Bucket | null = null;

  for (const line of blob.replace(/\r\n?/g, "\n").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Headers never start with a bullet glyph, so test for a bullet first: a
    // bullet whose text happens to read like a header must stay a bullet.
    if (!isBullet(trimmed)) {
      const header = BUCKET_BY_HEADER[normalizeHeader(trimmed)];
      if (header) {
        bucket = header;
        continue;
      }
      // Not a bullet and not a known header: a wrapped continuation of the
      // previous bullet. Anything before the first header is ignored.
      if (bucket && bucket !== "ignored") {
        const items = raw[bucket];
        if (items.length) {
          items[items.length - 1] = `${items[items.length - 1]} ${trimmed}`;
          continue;
        }
      }
      continue;
    }

    if (!bucket || bucket === "ignored") continue;

    // Some records double up the glyph ("• •\tStrong verbal ..."), so strip
    // every leading bullet/whitespace run rather than just the first.
    const text = trimmed.replace(BULLET_PREFIX, "").trim();
    if (!text) continue;
    raw[bucket].push(text);
  }

  for (const key of ["environmentalConditions", "physicalRequirements"] as const) {
    sections[key] = raw[key]
      .map((item) => item.replace(MARKER, "").trim())
      .filter((item) => item && !EMPTY_ITEM.test(item));
  }

  const splits: Array<[SplitBucket, keyof JobDescriptionSections, keyof JobDescriptionSections]> = [
    ["education", "educationRequired", "educationDesired"],
    ["experience", "experienceRequired", "experienceDesired"],
    ["certification", "certificationRequired", "certificationDesired"],
  ];

  for (const [source, requiredKey, desiredKey] of splits) {
    for (const item of raw[source]) {
      const match = item.match(MARKER);
      const text = (match ? item.slice(0, match.index) : item).trim();
      if (!text || EMPTY_ITEM.test(text)) continue;
      // An unmarked bullet reads as a baseline requirement; dropping it would
      // silently lose real content (e.g. "• Grad or Equiv").
      const desired = !!match && /^(preferred|desired)$/i.test(match[1]);
      sections[desired ? desiredKey : requiredKey].push(text);
    }
  }

  return sections;
}
