from datetime import date, timedelta


def fetch_daily_prices(symbol: str, market: str, start_date: date, end_date: date) -> list[dict]:
    prices = []
    current_date = start_date
    base_price = max(len(symbol) * 10, 20)
    day_index = 0

    while current_date <= end_date:
        if current_date.weekday() < 5:
            close_price = round(base_price + (day_index * 0.03), 4)
            prices.append(
                {
                    "trade_date": current_date,
                    "open_price": round(close_price * 0.99, 4),
                    "high_price": round(close_price * 1.01, 4),
                    "low_price": round(close_price * 0.98, 4),
                    "close_price": close_price,
                    "volume": 100000 + day_index,
                }
            )
        current_date += timedelta(days=1)
        day_index += 1

    return prices
