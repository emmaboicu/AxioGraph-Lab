/* ==================================================================
Configurează straturile, butoanele și culorile TrendLine/Extend Line 
=====================================================================*/
export function createTrendlineConfigs($) {
  return {
    1: {
      layer: $('trendline-layer-1'),
      activateBtn: $('activate-trendline-1'),
      fixBtn: $('fix-trendline-1'),
      resetBtn: $('reset-trendline-1'),
      color: '#0208cb',
      fixedColor: '#0008ff',
    },
    2: {
      layer: $('trendline-layer-2'),
      color: '#0208cb',
      fixedColor: '#0008ff',
    },
    3: {
      layer: $('trendline-layer-3'),
      color: '#0208cb',
      fixedColor: '#0008ff',
    },
    4: {
      layer: $('trendline-layer-4'),
      activateBtn: $('activate-trendline-4'),
      fixBtn: $('fix-trendline-4'),
      resetBtn: $('reset-trendline-4'),
      color: '#00897B',
      fixedColor:'#029688'
    },
    5: {
      layer: $('trendline-layer-5'),
      color: '#00897B',
      fixedColor: '#029688'
    },
    6: {
      layer: $('trendline-layer-6'),
      color: '#00897B',
      fixedColor: '#029688'
    }
  };
}