# Data & Export Schema

## Summary Row Schema
- `summary_row_id`: string
- `indicator_code`: string
- `indicator_label`: string
- `male_count`: number
- `female_count`: number
- `not_recorded_count`: number
- `total_count`: number
- `percentage`: number (optional)
- `period_start`: date
- `period_end`: date
- `program`: string
- `location_id`: string
- `generated_by`: string
- `generated_at`: timestamp

## Raw Data Schema
- `visit_id`: string
- `client_id`: string
- `gender`: 'Male' | 'Female' | 'Other'
- `dob`: date
- `age`: number
- `program`: string
- `service_type`: string
- `date`: date
- `staff_id`: string
- `location_id`: string
- `commodity_issued`: string
- `quantity`: number
- `referral_to`: string
- `referral_status`: 'Pending' | 'Completed'
- `notes`: string

## NSP Mapping Examples
- `needles_distributed`: Count of needles given
- `syringes_distributed`: Count of syringes given
- `needles_returned`: Count of needles returned
- `return_rate`: (Returned / Distributed) * 100
- `unique_clients`: Count of distinct client IDs
