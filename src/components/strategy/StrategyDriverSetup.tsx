import type { StrategyDriverConfig } from "../../types/strategy";

interface Props {
  drivers: StrategyDriverConfig[];
  onDriverCountChange: (count: number) => void;
  onDriversChange: (drivers: StrategyDriverConfig[]) => void;
  onRegenerate: () => void;
}

export function StrategyDriverSetup({
  drivers,
  onDriverCountChange,
  onDriversChange,
  onRegenerate,
}: Props) {
  const updateDriver = (
    index: number,
    patch: Partial<StrategyDriverConfig>,
  ) => {
    const next = drivers.map((d, i) => (i === index ? { ...d, ...patch } : d));
    onDriversChange(next);
  };

  return (
    <div className="strategy-setup">
      <div className="strategy-setup__row">
        <label className="strategy-setup__count">
          <span>Nombre de pilotes</span>
          <input
            type="number"
            min={1}
            max={8}
            value={drivers.length}
            onChange={(e) =>
              onDriverCountChange(Number.parseInt(e.target.value, 10) || 1)
            }
          />
        </label>
        <button
          type="button"
          className="strategy-setup__regen"
          onClick={onRegenerate}
        >
          Recalculer les relais
        </button>
      </div>

      <div className="strategy-setup__drivers">
        {drivers.map((driver, i) => (
          <div key={driver.id} className="strategy-setup__driver">
            <span
              className="strategy-setup__swatch"
              style={{ background: driver.color }}
              aria-hidden
            />
            <input
              type="text"
              className="strategy-setup__name"
              value={driver.name}
              placeholder={`Pilote ${i + 1}`}
              onChange={(e) => updateDriver(i, { name: e.target.value })}
            />
            <label className="strategy-setup__laps">
              <span>Tours / relais</span>
              <input
                type="number"
                min={1}
                max={99}
                value={driver.lapsPerStint}
                onChange={(e) =>
                  updateDriver(i, {
                    lapsPerStint:
                      Number.parseInt(e.target.value, 10) || 21,
                  })
                }
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
