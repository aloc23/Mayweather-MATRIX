/**
 * NOVA Analytics Calculations
 * Advanced financial analytics and portfolio calculations for Matrix-Nova
 */

class NovaCalculations {
  constructor() {
    this.cache = new Map();
    this.config = window.NovaConfig || {};
  }

  /**
   * Calculate portfolio performance metrics
   */
  calculatePortfolioMetrics(positions, historicalData) {
    const cacheKey = `portfolio_${JSON.stringify(positions)}_${Date.now()}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const metrics = {
      totalValue: this.calculateTotalValue(positions),
      dailyReturns: this.calculateDailyReturns(historicalData),
      volatility: this.calculateVolatility(historicalData),
      sharpeRatio: this.calculateSharpeRatio(historicalData),
      maxDrawdown: this.calculateMaxDrawdown(historicalData),
      beta: this.calculateBeta(historicalData),
      alpha: this.calculateAlpha(historicalData)
    };

    this.cache.set(cacheKey, metrics);
    return metrics;
  }

  /**
   * Calculate total portfolio value
   */
  calculateTotalValue(positions) {
    return positions.reduce((total, position) => {
      return total + (position.quantity * position.currentPrice);
    }, 0);
  }

  /**
   * Calculate daily returns from historical data
   */
  calculateDailyReturns(historicalData) {
    if (!historicalData || historicalData.length < 2) return [];
    
    const returns = [];
    for (let i = 1; i < historicalData.length; i++) {
      const prevValue = historicalData[i - 1].value;
      const currentValue = historicalData[i].value;
      const dailyReturn = (currentValue - prevValue) / prevValue;
      returns.push({
        date: historicalData[i].date,
        return: dailyReturn
      });
    }
    return returns;
  }

  /**
   * Calculate portfolio volatility (annualized standard deviation)
   */
  calculateVolatility(historicalData) {
    const returns = this.calculateDailyReturns(historicalData);
    if (returns.length === 0) return 0;

    const mean = returns.reduce((sum, r) => sum + r.return, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r.return - mean, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    
    // Annualize (assuming 252 trading days)
    return dailyVolatility * Math.sqrt(252);
  }

  /**
   * Calculate Sharpe Ratio
   */
  calculateSharpeRatio(historicalData, riskFreeRate = 0.02) {
    const returns = this.calculateDailyReturns(historicalData);
    if (returns.length === 0) return 0;

    const meanReturn = returns.reduce((sum, r) => sum + r.return, 0) / returns.length;
    const annualizedReturn = meanReturn * 252; // Annualize
    const volatility = this.calculateVolatility(historicalData);
    
    if (volatility === 0) return 0;
    return (annualizedReturn - riskFreeRate) / volatility;
  }

  /**
   * Calculate Maximum Drawdown
   */
  calculateMaxDrawdown(historicalData) {
    if (!historicalData || historicalData.length < 2) return 0;

    let maxDrawdown = 0;
    let peak = historicalData[0].value;

    for (let i = 1; i < historicalData.length; i++) {
      const currentValue = historicalData[i].value;
      
      if (currentValue > peak) {
        peak = currentValue;
      } else {
        const drawdown = (peak - currentValue) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    return maxDrawdown;
  }

  /**
   * Calculate Beta (correlation with market)
   */
  calculateBeta(portfolioData, marketData) {
    if (!portfolioData || !marketData || portfolioData.length !== marketData.length) {
      return 1.0; // Default beta
    }

    const portfolioReturns = this.calculateDailyReturns(portfolioData);
    const marketReturns = this.calculateDailyReturns(marketData);

    if (portfolioReturns.length !== marketReturns.length) return 1.0;

    const n = portfolioReturns.length;
    const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r.return, 0) / n;
    const marketMean = marketReturns.reduce((sum, r) => sum + r.return, 0) / n;

    let covariance = 0;
    let marketVariance = 0;

    for (let i = 0; i < n; i++) {
      const portfolioDiff = portfolioReturns[i].return - portfolioMean;
      const marketDiff = marketReturns[i].return - marketMean;
      
      covariance += portfolioDiff * marketDiff;
      marketVariance += marketDiff * marketDiff;
    }

    covariance /= n;
    marketVariance /= n;

    return marketVariance === 0 ? 1.0 : covariance / marketVariance;
  }

  /**
   * Calculate Alpha (excess return over expected return)
   */
  calculateAlpha(portfolioData, marketData, riskFreeRate = 0.02) {
    const portfolioReturns = this.calculateDailyReturns(portfolioData);
    const beta = this.calculateBeta(portfolioData, marketData);
    
    if (portfolioReturns.length === 0) return 0;

    const portfolioReturn = portfolioReturns.reduce((sum, r) => sum + r.return, 0) / portfolioReturns.length * 252;
    const marketReturns = this.calculateDailyReturns(marketData);
    const marketReturn = marketReturns.length > 0 ? 
      marketReturns.reduce((sum, r) => sum + r.return, 0) / marketReturns.length * 252 : 0.1;

    const expectedReturn = riskFreeRate + beta * (marketReturn - riskFreeRate);
    return portfolioReturn - expectedReturn;
  }

  /**
   * Risk Analysis: Value at Risk (VaR)
   */
  calculateVaR(historicalData, confidence = 0.95, timeHorizon = 1) {
    const returns = this.calculateDailyReturns(historicalData);
    if (returns.length === 0) return 0;

    const sortedReturns = returns.map(r => r.return).sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    const var1Day = -sortedReturns[index];
    
    // Scale for time horizon
    return var1Day * Math.sqrt(timeHorizon);
  }

  /**
   * Portfolio Optimization: Efficient Frontier calculation
   */
  calculateEfficientFrontier(assets, expectedReturns, covarianceMatrix, riskFreeRate = 0.02) {
    // Simplified efficient frontier calculation
    // In production, this would use more sophisticated optimization algorithms
    const numPoints = 50;
    const frontierPoints = [];
    
    for (let i = 0; i <= numPoints; i++) {
      const targetReturn = 0.05 + (i / numPoints) * 0.15; // 5% to 20% range
      const weights = this.optimizePortfolio(assets, expectedReturns, covarianceMatrix, targetReturn);
      const risk = this.calculatePortfolioRisk(weights, covarianceMatrix);
      
      frontierPoints.push({
        return: targetReturn,
        risk: risk,
        weights: weights
      });
    }
    
    return frontierPoints;
  }

  /**
   * Simple portfolio optimization (placeholder for more complex algorithms)
   */
  optimizePortfolio(assets, expectedReturns, covarianceMatrix, targetReturn) {
    // Simplified equal weight approach
    // In production, this would use quadratic programming or other optimization methods
    const numAssets = assets.length;
    const equalWeight = 1 / numAssets;
    return new Array(numAssets).fill(equalWeight);
  }

  /**
   * Calculate portfolio risk from weights and covariance matrix
   */
  calculatePortfolioRisk(weights, covarianceMatrix) {
    let risk = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        risk += weights[i] * weights[j] * (covarianceMatrix[i] ? covarianceMatrix[i][j] || 0 : 0);
      }
    }
    return Math.sqrt(risk);
  }

  /**
   * Clear calculation cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export for module systems or global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NovaCalculations;
} else {
  window.NovaCalculations = NovaCalculations;
}