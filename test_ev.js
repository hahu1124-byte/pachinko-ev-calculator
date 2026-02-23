
function test() {
    let playRate = 4;
    let cashoutPrice = 3.57;
    let prob = 9.68;
    let primaryProb = 319.688;
    let defaultRb = 140;
    
    let turnRatePer1k = 18;
    let activeBorderBase = 10.23;
    let ballsPer1k = 250;
    let ballRatio = 0.5;
    let investmentPrice = 4;

    const requiredBallsPerSpinBase = 250 / activeBorderBase;
    const requiredBallsPerSpinActual = ballsPer1k / turnRatePer1k;
    const expectedBallsPerSpin = requiredBallsPerSpinBase - requiredBallsPerSpinActual;
    const ballEvPerSpin = expectedBallsPerSpin * cashoutPrice;
    const cashEvPerSpin = expectedBallsPerSpin * cashoutPrice - requiredBallsPerSpinActual * (investmentPrice - cashoutPrice);
    const valuePerSpin = (ballEvPerSpin * ballRatio) + (cashEvPerSpin * (1 - ballRatio));
    
    const hours = 10;
    const spinsPerHour = 200;
    const hourlyEV = valuePerSpin * spinsPerHour;
    const dailyEV = hourlyEV * hours;

    let yutimeSpins = 200;
    let yutimeRb = 14;
    let reachProb = Math.pow(1 - (1 / primaryProb), yutimeSpins);
    let yutimeExpectedBalls = yutimeRb * defaultRb;
    let yutimeBonusEV = reachProb * yutimeExpectedBalls * cashoutPrice;
    let yutimeEV = dailyEV + yutimeBonusEV;

    console.log("dailyEV:", dailyEV);
    console.log("yutimeBonusEV:", yutimeBonusEV);
    console.log("yutimeEV:", yutimeEV);
    console.log("reachProb:", reachProb);
}
test();

