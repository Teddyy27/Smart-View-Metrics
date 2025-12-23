import React, { useState, useMemo, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sun, CloudSun, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { db } from '@/services/firebase';
import { ref, onValue, off, query, limitToLast } from 'firebase/database';

interface SolarDataPoint {
    timestamp: Date;
    formattedTime: string;
    value: number;
    type: 'Actual' | 'Predicted';
}

const SolarPrediction = () => {
    const [data, setData] = useState<SolarDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [nextMonthPredicted, setNextMonthPredicted] = useState(0);

    useEffect(() => {
        const solarRef = ref(db, 'solar_radiation');
        // Limit to last 2000 data points to prevent huge payload
        const solarQuery = query(solarRef, limitToLast(2000));
        const nextMonthRef = ref(db, 'next_month_forecast');

        // Handler for Solar Data
        const handleData = (snapshot: any) => {
            if (!snapshot.exists()) {
                setData([]);
                setLoading(false);
                return;
            }

            const val = snapshot.val();
            const loadedData: SolarDataPoint[] = [];
            const now = new Date();

            // Helper to process a single entry
            const processEntry = (key: string, value: any) => {
                // Try to find a date/timestamp field
                let dateObj: Date | null = null;

                if (value.timestamp) {
                    dateObj = new Date(value.timestamp);
                } else if (value.date) {
                    dateObj = new Date(value.date);
                } else if (!isNaN(Date.parse(key))) {
                    // Try using the key if it's a date string
                    dateObj = new Date(key);
                }

                if (dateObj && !isNaN(dateObj.getTime())) {
                    // Determine if actual or predicted based on time
                    const isPredicted = dateObj.getTime() > now.getTime();
                    const irradiance = Number(value.value || value.irradiance || value) || 0;

                    loadedData.push({
                        timestamp: dateObj,
                        formattedTime: `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`,
                        value: parseFloat(irradiance.toFixed(2)),
                        type: isPredicted ? 'Predicted' : 'Actual'
                    });
                }
            };

            // Handle array or object
            if (Array.isArray(val)) {
                val.forEach((item, index) => processEntry(String(index), item));
            } else {
                Object.keys(val).forEach(key => processEntry(key, val[key]));
            }

            // Sort by timestamp
            loadedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            setData(loadedData);
            setLoading(false);
        };

        const handleNextMonth = (snapshot: any) => {
            const val = snapshot.val();
            if (val) {
                setNextMonthPredicted(Number(val?.value || val) || 0);
            }
        };

        const unsubscribe = onValue(solarQuery, handleData);
        const unsubscribeNext = onValue(nextMonthRef, handleNextMonth);

        return () => {
            off(solarQuery, 'value', handleData);
            off(nextMonthRef, 'value', handleNextMonth);
        };
    }, []);

    // Calculate current and max values
    const currentIrradiance = useMemo(() => {
        if (data.length === 0) return { value: 0, formattedTime: 'No Data' };

        // Find the latest "Actual" data point
        const actuals = data.filter(d => d.type === 'Actual');
        if (actuals.length > 0) {
            return actuals[actuals.length - 1];
        }
        return data[0];
    }, [data]);

    const maxPrediction = useMemo(() => {
        const predicted = data.filter(d => d.type === 'Predicted');
        if (predicted.length === 0) return 0;
        return Math.max(...predicted.map(d => d.value));
    }, [data]);

    const chartData = useMemo(() => {
        return data.map(d => ({
            name: d.formattedTime.split(' ')[1], // Time only for X-axis
            fullTime: d.formattedTime,
            Actual: d.type === 'Actual' ? d.value : null,
            Predicted: d.type === 'Predicted' ? d.value : null,
            value: d.value // For reference
        }));
    }, [data]);


    if (loading) {
        return (
            <Layout>
                <div className="h-full flex items-center justify-center min-h-[50vh]">
                    <div className="text-xl animate-pulse">Loading solar data...</div>
                </div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <Sun className="h-8 w-8 text-yellow-500" />
                        Solar Irradiance Prediction
                    </h1>
                    <p className="text-muted-foreground">
                        Real-time solar irradiance monitoring and forecast.
                    </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Current Irradiance</CardTitle>
                            <Sun className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{currentIrradiance?.value} W/m²</div>
                            <p className="text-xs text-muted-foreground">
                                Updated: {currentIrradiance?.formattedTime}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Peak Predicted</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{maxPrediction.toFixed(2)} W/m²</div>
                            <p className="text-xs text-muted-foreground">
                                Highest expected output
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Forecast Status</CardTitle>
                            <CloudSun className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {data.length > 0 ? (maxPrediction > 800 ? "High Output" : "Moderate") : "No Data"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Based on available data
                            </p>
                        </CardContent>
                    </Card>


                </div>

                {/* Chart */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Solar Irradiance (Actual vs Predicted)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px] w-full">
                            {data.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis dataKey="name" />
                                        <YAxis label={{ value: 'W/m²', angle: -90, position: 'insideLeft' }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            labelFormatter={(label, payload) => {
                                                if (payload && payload.length > 0) {
                                                    return payload[0].payload.fullTime;
                                                }
                                                return label;
                                            }}
                                        />
                                        <Legend />
                                        <ReferenceLine x={chartData.find(d => !d.Actual)?.name} stroke="red" strokeDasharray="3 3" label="Now" />
                                        <Line type="monotone" dataKey="Actual" stroke="#eab308" strokeWidth={2} name="Actual Irradiance" dot={false} />
                                        <Line type="monotone" dataKey="Predicted" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Predicted Irradiance" dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground">
                                    No solar data available from Firebase (/solar_radiation)
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Next 7 Days Forecast */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Next Week Average Prediction
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Calculate daily averages from future data */}
                        {(() => {
                            // Filter for future data
                            const futureData = data.filter(d => d.type === 'Predicted');

                            // Group by day (YYYY-MM-DD)
                            const dailyGroups: Record<string, number[]> = {};
                            futureData.forEach(d => {
                                const dayKey = `${d.timestamp.getFullYear()}-${String(d.timestamp.getMonth() + 1).padStart(2, '0')}-${String(d.timestamp.getDate()).padStart(2, '0')}`;
                                if (!dailyGroups[dayKey]) {
                                    dailyGroups[dayKey] = [];
                                }
                                dailyGroups[dayKey].push(d.value);
                            });

                            // Calculate averages
                            const dailyAverages = Object.entries(dailyGroups).map(([date, values]) => ({
                                date,
                                avg: values.reduce((a, b) => a + b, 0) / values.length
                            })).sort((a, b) => a.date.localeCompare(b.date));

                            // Limit to next 7 days if desired, or show all available

                            if (dailyAverages.length === 0) {
                                return (
                                    <div className="text-center py-4 text-muted-foreground">
                                        No future prediction data available.
                                    </div>
                                );
                            }

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {dailyAverages.map((day) => (
                                        <div key={day.date} className="bg-secondary/20 p-4 rounded-lg flex flex-col items-center justify-center border">
                                            <span className="text-sm font-medium text-muted-foreground mb-1">
                                                {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                            </span>
                                            <span className="text-2xl font-bold font-mono">
                                                {day.avg.toFixed(2)}
                                            </span>
                                            <span className="text-xs text-muted-foreground mt-1">
                                                Avg W/m²
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Detailed Data Points
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <div className="grid grid-cols-1 divide-y max-h-[500px] overflow-y-auto">
                                {data.map((row, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono text-sm">{row.formattedTime.split(' ')[0]}</span>
                                            <Badge variant={row.type === 'Actual' ? 'default' : 'secondary'} className={row.type === 'Actual' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}>
                                                {row.type}
                                            </Badge>
                                        </div>
                                        <div className="font-medium">
                                            {row.value} <span className="text-muted-foreground text-sm font-normal">(units watts per meter sqaure)</span>
                                        </div>
                                    </div>
                                ))}
                                {data.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No data available.
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
};

export default SolarPrediction;
