
import React from 'react';
import { CloudSun, Cloud, CloudRain, CloudLightning, Sun } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const WeatherWidget = ({ temperature, humidity, summary, windSpeed }) => {
  // Select icon based on weather summary
  const getWeatherIcon = () => {
    switch (summary.toLowerCase()) {
      case 'clear':
        return <Sun className="h-10 w-10 text-yellow-500" />;
      case 'partly cloudy':
        return <CloudSun className="h-10 w-10 text-blue-400" />;
      case 'cloudy':
        return <Cloud className="h-10 w-10 text-gray-400" />;
      case 'rain':
        return <CloudRain className="h-10 w-10 text-blue-600" />;
      case 'thunderstorm':
        return <CloudLightning className="h-10 w-10 text-purple-500" />;
      default:
        return <CloudSun className="h-10 w-10 text-blue-400" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Current Weather</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{temperature.toFixed(1)}°C</p>
            <p className="text-muted-foreground">Humidity: {(humidity * 100).toFixed(0)}%</p>
            <p className="text-muted-foreground">Wind: {windSpeed.toFixed(1)} km/h</p>
          </div>
          <div className="flex flex-col items-center">
            {getWeatherIcon()}
            <p className="mt-1">{summary}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
