# API Validate

validate api response data against blueprint api documented schema. can be used to help contract testing.
based on [ajv validator](https://ajv.js.org/) and [apiaryio/protagonist](https://github.com/apiaryio/protagonist)

install node and run `npm install` in the directory

usage:

```bash
./index.js -s example_spec.md -d example_data.json

----------------------------
GET /v4/latest/{base}
 ===> OK
```

