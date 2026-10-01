-- BAO activity source. Parameters: builder_code (text), days (number, 90),
-- chain_id (number, 8453). Ordinary transactions only; see docs/dashboard.md.
-- Do not use this result to claim coverage of ERC-4337 user operations.
WITH decoded AS (
  SELECT *
  FROM TABLE(functions.base_l2.call_data_8021(
    input => TABLE(
      SELECT
        hash AS tx_hash,
        8453 AS chain_id,
        block_time,
        "from" AS sender,
        "to" AS recipient,
        success,
        CAST(gas_used AS varchar) AS gas_used,
        CAST(gas_price AS varchar) AS gas_price,
        CAST(l1_fee AS varchar) AS l1_fee,
        CAST(data AS varchar) AS calldata
      FROM base.transactions
      WHERE {{chain_id}} = 8453
        AND block_time >= date_trunc('day', current_timestamp)
          - ({{days}} - 1) * interval '1' day
        AND block_time <= current_timestamp
    ),
    calldata => DESCRIPTOR(calldata)
  ))
)
SELECT
  tx_hash, chain_id, block_time, sender, recipient, success,
  gas_used, gas_price, l1_fee, calldata, codes_array
FROM decoded
WHERE contains(codes_array, '{{builder_code}}')
ORDER BY block_time DESC;
