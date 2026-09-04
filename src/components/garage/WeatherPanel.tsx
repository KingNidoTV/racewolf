import type { WeatherInfo } from "../../types/telemetry";

interface Props {
  weather: WeatherInfo;
}

export function WeatherPanel({ weather }: Props) {
  return (
    <section className="garage-panel garage-panel--weather">
      <h3 className="garage-panel__title">Météo</h3>
      <dl className="garage-weather-grid">
        <div>
          <dt>Air</dt>
          <dd>{weather.airTempC} °C</dd>
        </div>
        <div>
          <dt>Piste</dt>
          <dd>{weather.trackTempC} °C</dd>
        </div>
        <div>
          <dt>Ciel</dt>
          <dd>{weather.skiesLabel}</dd>
        </div>
        <div>
          <dt>Eau sur la piste</dt>
          <dd>{weather.trackWetnessLabel}</dd>
        </div>
      </dl>
      {weather.rainAlert ? (
        <p className="garage-weather-alert" role="status">
          {weather.rainAlert}
        </p>
      ) : (
        <p className="garage-weather-ok">Pas de pluie prévue à court terme</p>
      )}
    </section>
  );
}
