import {
  IRACING_TRACKS,
  findCatalogEntry,
  groupTracksByVenue,
  layoutLabel,
  trackVenueName,
} from "../../data/catalog";
import { EnduranceMenuSelect } from "./EnduranceMenuSelect";

interface Props {
  valueId: string;
  placeholder: string;
  onChange: (id: string, label: string) => void;
}

export function TrackSelect({ valueId, placeholder, onChange }: Props) {
  const venues = groupTracksByVenue(IRACING_TRACKS);
  const selectedTrack = valueId
    ? findCatalogEntry(IRACING_TRACKS, valueId)
    : undefined;
  const currentVenue = selectedTrack ? trackVenueName(selectedTrack) : "";
  const activeGroup = venues.find((group) => group.venue === currentVenue);
  const hasVariants = (activeGroup?.layouts.length ?? 0) > 1;

  const selectVenue = (venue: string) => {
    if (!venue) {
      onChange("", "");
      return;
    }
    const group = venues.find((entry) => entry.venue === venue);
    const layout = group?.layouts[0];
    if (!layout) return;
    onChange(layout.id, layout.label);
  };

  const selectLayout = (id: string) => {
    const entry = findCatalogEntry(IRACING_TRACKS, id);
    onChange(id, entry?.label ?? "");
  };

  return (
    <div className="endurance-track-select">
      <EnduranceMenuSelect
        value={currentVenue}
        placeholder={placeholder}
        options={venues.map(({ venue }) => ({
          value: venue,
          label: venue,
        }))}
        onChange={selectVenue}
      />

      {hasVariants && activeGroup ? (
        <label className="endurance-track-select__variant">
          <span>Variante</span>
          <EnduranceMenuSelect
            value={valueId}
            placeholder="Variante…"
            options={activeGroup.layouts.map((layout) => ({
              value: layout.id,
              label: layoutLabel(layout),
            }))}
            onChange={selectLayout}
          />
        </label>
      ) : null}
    </div>
  );
}
