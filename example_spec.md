FORMAT: 1A
HOST: https://api.exchangerate-api.com

# Exchange Rate API

sample public api example 

# Data Structures

## ExchangeResponse (object)
+ base: `USD` (string, required) - base currency
+ date: `2020-01-01` (string, required) - date string
+ time_last_updated: `1578528609` (number, required) - last updated time tick
+ rates (object, required) - exchange rates
  + CNY: `6.9` (number, required)
  + EUR: `0.89` (number, required)

## ErrorResponse (object)
+ result (string, required)
+ error_type (string, required)

# Endpoints

## Group Exchage
### Get [GET /v4/latest/{base}]
 get exchange rate for a base currency
+ Request (application/json)
    + Headers

            Accept: application/json (string, optional)
+ Parameters
    + base: `USD` (string) - base currency
+ Response 200 (application/json)
    + Attributes (ExchangeResponse)
+ Response 404 (application/json)
    + Attributes (ErrorResponse)
