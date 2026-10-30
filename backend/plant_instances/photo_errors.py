from rest_framework.exceptions import APIException


class PhotoError(APIException):
    def __init__(self, code, message, status=400):
        self.status_code = status
        super().__init__({"code": code, "detail": message})
