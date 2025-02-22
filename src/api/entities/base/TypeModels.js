export const typeModels = {
    "PersistenceResourcePostReturn": {
        "name": "PersistenceResourcePostReturn",
        "since": 1,
        "type": "DATA_TRANSFER_TYPE",
        "id": 0,
        "rootId": "BGJhc2UAAA",
        "versioned": false,
        "encrypted": false,
        "values": {
            "_format": {
                "final": false,
                "name": "_format",
                "id": 1,
                "since": 1,
                "type": "Number",
                "cardinality": "One",
                "encrypted": false
            },
            "generatedId": {
                "final": false,
                "name": "generatedId",
                "id": 2,
                "since": 1,
                "type": "GeneratedId",
                "cardinality": "ZeroOrOne",
                "encrypted": false
            },
            "permissionListId": {
                "final": false,
                "name": "permissionListId",
                "id": 3,
                "since": 1,
                "type": "GeneratedId",
                "cardinality": "One",
                "encrypted": false
            }
        },
        "associations": {},
        "app": "base",
        "version": "1"
    }
}