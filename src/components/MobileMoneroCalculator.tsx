import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Smartphone, TrendingUp, Users, Zap, DollarSign } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";

const MobileMoneroCalculator = () => {
  const { t } = useLanguage();
  const [hashrate, setHashrate] = useState([800]); // H/s - adjusted for modern devices
  const [usersSliderValue, setUsersSliderValue] = useState([25]); // Slider position (0-100)
  const [moneroPrice, setMoneroPrice] = useState([300]); // USD price per XMR

  // Logarithmic scale conversion functions
  const sliderToUsers = (sliderValue: number): number => {
    // Map 0-100 slider to 1-2B users logarithmically
    // 0-40: 1 to 100K (more granular for small numbers)
    // 40-70: 100K to 10M 
    // 70-90: 10M to 1B
    // 90-100: 1B to 2B
    
    if (sliderValue <= 40) {
      // 1 to 100,000 users (0-40% of slider)
      const progress = sliderValue / 40;
      return Math.round(1 * Math.pow(100000, progress));
    } else if (sliderValue <= 70) {
      // 100,000 to 10,000,000 users (40-70% of slider)
      const progress = (sliderValue - 40) / 30;
      return Math.round(100000 * Math.pow(100, progress));
    } else if (sliderValue <= 90) {
      // 10,000,000 to 1,000,000,000 users (70-90% of slider)
      const progress = (sliderValue - 70) / 20;
      return Math.round(10000000 * Math.pow(100, progress));
    } else {
      // 1,000,000,000 to 2,000,000,000 users (90-100% of slider)
      const progress = (sliderValue - 90) / 10;
      return Math.round(1000000000 * (1 + progress));
    }
  };

  const usersToSlider = (userCount: number): number => {
    // Convert user count back to slider position
    if (userCount <= 100000) {
      const progress = Math.log(userCount) / Math.log(100000);
      return Math.round(progress * 40);
    } else if (userCount <= 10000000) {
      const progress = Math.log(userCount / 100000) / Math.log(100);
      return Math.round(40 + progress * 30);
    } else if (userCount <= 1000000000) {
      const progress = Math.log(userCount / 10000000) / Math.log(100);
      return Math.round(70 + progress * 20);
    } else {
      const progress = (userCount - 1000000000) / 1000000000;
      return Math.round(90 + progress * 10);
    }
  };

  const users = sliderToUsers(usersSliderValue[0]);

  // Monero mining constants (approximate current values)
  const networkHashrate = 2.8e9; // ~2.8 GH/s network hashrate
  const blockReward = 0.6; // ~0.6 XMR per block
  const blockTime = 120; // 2 minutes per block

  const calculations = useMemo(() => {
    const totalHashrate = hashrate[0] * users;
    const shareOfNetwork = totalHashrate / networkHashrate;
    const xmrPerDay = (shareOfNetwork * blockReward * (24 * 60 * 60)) / blockTime;
    const usdPerDay = xmrPerDay * moneroPrice[0];
    const xmrPerMonth = xmrPerDay * 30;
    const usdPerMonth = xmrPerMonth * moneroPrice[0];
    const xmrPerYear = xmrPerDay * 365;
    const usdPerYear = xmrPerYear * moneroPrice[0];

    return {
      totalHashrate,
      shareOfNetwork: shareOfNetwork * 100,
      xmrPerDay,
      usdPerDay,
      xmrPerMonth,
      usdPerMonth,
      xmrPerYear,
      usdPerYear,
    };
  }, [hashrate, users, moneroPrice]);

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(decimals);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* MobileMonero Information */}
      <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-white text-lg sm:text-xl">
            <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400 flex-shrink-0" />
            <span className="text-base sm:text-xl">{t('calculator.info.title')}</span>
          </CardTitle>
          <CardDescription className="text-gray-300 text-sm sm:text-base">
            {t('calculator.info.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2 sm:space-y-3">
              <h4 className="text-base sm:text-lg font-semibold text-purple-400">{t('calculator.info.how.works')}</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-300">
                <li>• {t('calculator.info.how.works.point1')}</li>
                <li>• {t('calculator.info.how.works.point2')}</li>
                <li>• {t('calculator.info.how.works.point3')}</li>
                <li>• {t('calculator.info.how.works.point4')}</li>
                <li>• {t('calculator.info.how.works.point5')}</li>
              </ul>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <h4 className="text-base sm:text-lg font-semibold text-blue-400">{t('calculator.info.dao.benefits')}</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-300">
                <li>• {t('calculator.info.dao.benefits.point1')}</li>
                <li>• {t('calculator.info.dao.benefits.point2')}</li>
                <li>• {t('calculator.info.dao.benefits.point3')}</li>
                <li>• {t('calculator.info.dao.benefits.point4')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mining Calculator */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-white text-lg sm:text-xl">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-400 flex-shrink-0" />
            <span className="text-base sm:text-xl">{t('calculator.mining.title')}</span>
          </CardTitle>
          <CardDescription className="text-gray-400 text-sm sm:text-base">
            {t('calculator.info.empowering')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                  <Label className="text-gray-300 text-sm sm:text-base">{t('calculator.hashrate.label')}</Label>
                  <span className="text-purple-400 font-mono text-sm sm:text-base">
                    {hashrate[0] >= 1000 ? `${(hashrate[0] / 1000).toFixed(1)} KH/s` : `${hashrate[0]} H/s`}
                  </span>
                </div>
                <Slider
                  value={hashrate}
                  onValueChange={setHashrate}
                  max={5000}
                  min={200}
                  step={100}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>200 H/s</span>
                  <span>5.0 KH/s</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Modern processors with SSB can achieve 3-5+ KH/s
                </div>
              </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                <Label className="text-gray-300 text-sm sm:text-base">{t('calculator.devices.label')}</Label>
                <span className="text-blue-400 font-mono text-sm sm:text-base">{formatNumber(users, 0)}</span>
              </div>
              <Slider
                value={usersSliderValue}
                onValueChange={setUsersSliderValue}
                max={100}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1</span>
                <span>2B</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                2B Android users worldwide - each could mine XMR
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                <Label className="text-gray-300 text-sm sm:text-base">{t('calculator.price.label')}</Label>
                <span className="text-green-400 font-mono text-sm sm:text-base">${formatNumber(moneroPrice[0], 0)}</span>
              </div>
              <Slider
                value={moneroPrice}
                onValueChange={setMoneroPrice}
                max={5000}
                min={150}
                step={moneroPrice[0] < 1000 ? 25 : 100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>$150</span>
                <span>$5,000</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Privacy premium could drive XMR to $5K+ over 10 years
              </div>
            </div>
          </div>

          {/* Network Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gray-900/50 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-purple-400 font-mono text-sm sm:text-lg">
                {calculations.totalHashrate >= 1000 ? 
                  `${formatNumber(calculations.totalHashrate / 1000)} KH/s` : 
                  `${formatNumber(calculations.totalHashrate)} H/s`}
              </div>
              <div className="text-xs text-gray-400">Total Hashrate</div>
            </div>
            <div className="bg-gray-900/50 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-blue-400 font-mono text-sm sm:text-lg">
                {calculations.shareOfNetwork.toFixed(4)}%
              </div>
              <div className="text-xs text-gray-400">Network Share</div>
            </div>
            <div className="bg-gray-900/50 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-green-400 font-mono text-sm sm:text-lg">
                ${formatNumber(moneroPrice[0], 0)}
              </div>
              <div className="text-xs text-gray-400">XMR Price</div>
            </div>
            <div className="bg-gray-900/50 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-yellow-400 font-mono text-sm sm:text-lg">
                {formatNumber(networkHashrate / 1e9, 1)} GH/s
              </div>
              <div className="text-xs text-gray-400">Network Hashrate</div>
            </div>
          </div>

          {/* Earnings Projections */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
              {t('calculator.earnings.title')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <Card className="bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-700/50">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-green-400">
                    {calculations.xmrPerDay.toFixed(4)} XMR
                  </div>
                  <div className="text-green-300 font-mono text-sm sm:text-base">
                    ${calculations.usdPerDay.toFixed(2)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">{t('calculator.earnings.daily')}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-700/50">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-blue-400">
                    {calculations.xmrPerMonth.toFixed(2)} XMR
                  </div>
                  <div className="text-blue-300 font-mono text-sm sm:text-base">
                    ${formatNumber(calculations.usdPerMonth)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">{t('calculator.earnings.monthly')}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-700/50 sm:col-span-2 lg:col-span-1">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-purple-400">
                    {formatNumber(calculations.xmrPerYear)} XMR
                  </div>
                  <div className="text-purple-300 font-mono text-sm sm:text-base">
                    ${formatNumber(calculations.usdPerYear)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">{t('calculator.earnings.yearly')}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 sm:p-4">
            <p className="text-yellow-400 text-xs sm:text-sm">
              <strong>{t('calculator.disclaimer')}</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileMoneroCalculator;