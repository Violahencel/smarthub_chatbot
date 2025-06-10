## Update 8 ✅ COMPLETED
- Standard CRUD operation for mongodb
- Data structure is dynamic and may change on case to case basis
- Expose REST API endpoint, payload will define the "tablename"
- Create some basic mandatory fields for any normal record.
- Other fields are dynamic fields and will be populated runtime
- POST may accept and array of record or single record - all entries are to be saved as separate record in database. POST response back always with an array be it single or multiple with the updated record containing the IDs etc.
- PUT and DELETE will always be single record
- GET supports filters on any fields of the records, index only by the id for now