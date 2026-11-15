@echo off
setlocal

if not exist reports mkdir reports

echo ==================================================
echo  Running Grafana k6 Performance Test Suite (5/5)
echo ==================================================

echo.
echo [1/5] Running Smoke Test (GET, POST, PUT, PATCH, DELETE)...
k6 run tests/smoke-test.js

echo.
echo [2/5] Running Load Test (Weighted 70/20/10)...
k6 run tests/load-test.js

echo.
echo [3/5] Running Stress Test (Weighted 50/40/10)...
k6 run tests/stress-test.js

echo.
echo [4/5] Running Spike Test (Sudden 20x Surge)...
k6 run tests/spike-test.js

echo.
echo [5/5] Running Data-Driven Test (10 Parameterized Orders)...
k6 run tests/data-driven-test.js

echo.
echo ==================================================
echo  All 5 k6 test suites finished!
echo  HTML reports saved in: reports\*-summary.html
echo ==================================================
endlocal
