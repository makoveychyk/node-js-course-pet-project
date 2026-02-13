# Concurrency notes

Risks
- Oversell when multiple requests deduct stock concurrently.
- Partial writes (order created but items or stock updates fail).

Mitigation
- Create order in a single transaction.
- Use SELECT ... FOR UPDATE on products being purchased.
- Validate stock under lock, then update stock and insert order + items.

Result
- Concurrent purchase attempts on low-stock products return 409 for insufficient stock.
- No partial orders are persisted on errors.
