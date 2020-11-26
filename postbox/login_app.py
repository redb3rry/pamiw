from datetime import timedelta
from bcrypt import hashpw, checkpw, gensalt
from flask import Flask, render_template, request, make_response, session
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, jwt_refresh_token_required, \
    set_access_cookies, get_jwt_identity, unset_jwt_cookies, create_refresh_token
from const import *
import redis
import uuid
import os

load_dotenv()

db = redis.Redis(host='redis-db', port=6379, decode_responses=True)

app = Flask(__name__, static_url_path="/")
app.secret_key = os.environ.get(SECRET_KEY)

app.config["JWT_SECRET_KEY"] = os.environ.get(SECRET_KEY)
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = TOKEN_EXPIRES_IN_SECONDS
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=5)

jwt = JWTManager(app)
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
salt = gensalt(10)


def save_user(name, surname, password, login, birthdate, street, number, postal, country):
    try:
        password = password.encode()
        hashed_pass = hashpw(password, salt)
        db.hset(f'user:{login}', "login", login)
        db.hset(f'user:{login}', "password", hashed_pass)
        db.hset(f'user:{login}', "name", name)
        db.hset(f'user:{login}', "surname", surname)
        db.hset(f'user:{login}', "birthdate", birthdate)
        db.hset(f'user:{login}', "street", street)
        db.hset(f'user:{login}', "number", number)
        db.hset(f'user:{login}', "postal", postal)
        db.hset(f'user:{login}', "country", country)

        return True
    except Exception:
        return False


def login_check(login, password):
    db_password = db.hget(f'user:{login}', 'password')
    password = password.encode()
    db_password = db_password.encode()
    if not db_password:
        print(f'User with {login} does not exist')
        return False
    return checkpw(password, db_password)


@app.route("/")
def index():
    session_id = session.get("session-id")
    if session_id is not None:
        login = get_jwt_identity()
        access_token = create_access_token(identity=login)
        response = make_response(render_template("home.html"), 200)
        set_access_cookies(response, access_token)
        return response
    else:
        return render_template("home.html")


@app.route("/registration", methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        login = request.form.get("login")
        name = request.form.get("name")
        surname = request.form.get("surname")
        birthdate = request.form.get("birthdate")
        pesel = request.form.get("pesel")
        password = request.form.get("password")
        second_password = request.form.get("second_password")
        street = request.form.get("street")
        number = request.form.get("number")
        postal = request.form.get("postal-code")
        country = request.form.get("country")

        if password != second_password:
            return make_response("Repeated password doesn't match password", 400)

        if None in [login, name, surname, birthdate, pesel, password, second_password, street, number, postal, country]:
            return make_response("Not every field was filled!", 400)

        if not check_login_available(login):
            return make_response("Login taken!", 400)

        save_user(name, surname, password, login, birthdate, street, number, postal, country)

        response = make_response("", 301)
        response.headers["Location"] = "/"
        return response

    else:
        return render_template("registration.html")


@app.route("/login", methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        login = request.form.get("login")
        password = request.form.get("password")
        if None in [login, password]:
            return make_response("Not every field was filled!", 400)
        if login_check(login, password) is False:
            return make_response("Invalid credentials", 400)

        session_id = uuid.uuid4().hex
        db.hset(f'user:{login}', "session-id", session_id)
        app.logger.debug(type(login))
        access_token = create_access_token(identity=login)
        response = make_response("", 301)
        # response.set_cookie("session-id", session_id, max_age=300, secure=True, httponly=True)
        session["session-id"] = session_id
        session.permanent = True
        set_access_cookies(response, access_token)
        response.headers["Location"] = "/"
        return response
    else:
        return render_template("login.html")


@app.route("/logout")
def logout():
    # db.hdel()
    response = make_response("", 301)
    session.clear()
    unset_jwt_cookies(response)
    response.headers["Location"] = "/"
    return response


@app.route('/login/check/<login>', methods=['GET'])
def check_available(login):
    if db.hexists(f'user:{login}', "login"):
        return make_response("login unavailable", 200)
    return make_response("login available", 404)


def check_login_available(login):
    if db.hexists(f'user:{login}', "login"):
        return False
    return True


@app.before_request
def refresh_session():
    session.modified = True


def save_package(login, sender_name, sender_surname, sender_address, sender_phone, receiver_name, receiver_surname,
                 receiver_address, receiver_phone, package_photo):
    package_id = uuid.uuid4()
    db.hset(f'package_id:{package_id}', "sender_name", sender_name)
    db.hset(f'package_id:{package_id}', "sender_surname", sender_surname)
    db.hset(f'package_id:{package_id}', "sender_address", sender_address)
    db.hset(f'package_id:{package_id}', "sender_phone", sender_phone)
    db.hset(f'package_id:{package_id}', "receiver_name", receiver_name)
    db.hset(f'package_id:{package_id}', "receiver_surname", receiver_surname)
    db.hset(f'package_id:{package_id}', "receiver_address", receiver_address)
    db.hset(f'package_id:{package_id}', "receiver_phone", receiver_phone)
    db.hset(f'package_id:{package_id}', "package_photo", package_photo)

    db.hset(f'packages:{login}')
    return


@jwt_required
@app.route("/send", methods=['GET', 'POST'])
def send_file():
    if request.method == "POST":
        login = get_jwt_identity()
        sender_name = request.form.get("sender-name")
        sender_surname = request.form.get("sender-surname")
        sender_address = request.form.get("sender-address")
        sender_phone = request.form.get("sender-phone")
        receiver_name = request.form.get("receiver-name")
        receiver_surname = request.form.get("receiver-surname")
        receiver_address = request.form.get("receiver-address")
        receiver_phone = request.form.get("receiver-phone")
        package_photo = request.form.get("package-photo")

        if None in [login, sender_name, sender_surname, sender_address, sender_phone, receiver_name, receiver_surname,
                    receiver_address, receiver_phone, package_photo]:
            return make_response("Not every field was filled!", 400)

        save_package(login, sender_name, sender_surname, sender_address, sender_phone, receiver_name, receiver_surname,
                     receiver_address, receiver_phone, package_photo)
        response = make_response("", 301)
        response.headers["Location"] = "/"
        return response
    else:
        return render_template('sendwaybill.html')


@jwt_required
@app.route("/list")
def package_list():
    app.logger.debug(request.cookies)
    login = get_jwt_identity()
    return str(login)
