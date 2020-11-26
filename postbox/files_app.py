import uuid

from flask import Flask, render_template, send_file, request, make_response
import logging
from const import *
from flask_jwt_extended import JWTManager, jwt_required,get_jwt_identity
import redis
import os

app = Flask(__name__, static_url_path="")
db = redis.Redis(host="redis-db", port=6379, decode_responses=True)
log = app.logger

app.config["JWT_SECRET_KEY"] = os.environ.get(SECRET_KEY)
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = TOKEN_EXPIRES_IN_SECONDS

jwt = JWTManager(app)
app.config['JWT_TOKEN_LOCATION'] = ['cookies']


def setup():
    log.setLevel(logging.DEBUG)


@jwt_required
@app.route("/download-files/<file_id>", methods=[GET])
def download_file(file_id):
    try:
        full_filename = os.path.join(FILES_PATH, file_id)
        return send_file(full_filename)
    except Exception as e:
        log.error("File not found :(")
        log.error(str(e))
        return {"message": "File not found... :("}, 404


@app.route("/upload-file", methods=[POST])
def upload_file():
    maybe_file = request.files["shipment_img"]
    save_file(maybe_file)
    return {"message": "Maybe saved the file."}


def save_file(file_to_save):
    if len(file_to_save.filename) > 0:
        path_to_file = os.path.join(FILES_PATH, file_to_save.filename)
        file_to_save.save(path_to_file)
    else:
        log.warn("Empty content of file!")
