from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from models import db, User, Feed
from helpers import login_required
import json

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        first_name = request.form.get("first_name")
        last_name = request.form.get("last_name")
        email = request.form.get("email")
        password = request.form.get("password")
        password2 = request.form.get("password2")
        role = request.form.get("role", "user")

        if not all([username, first_name, last_name, email, password, password2]):
            flash("All fields are required")
            return redirect(url_for("auth.register"))

        if password != password2:
            flash("Passwords do not match")
            return redirect(url_for("auth.register"))

        if User.query.filter_by(username=username).first() or User.query.filter_by(email=email).first():
            flash("Username or email already exists")
            return redirect(url_for("auth.register"))

        new_user = User(
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=generate_password_hash(password),
            role=role,
        )
        db.session.add(new_user)
        db.session.commit()
        flash("User registered successfully!")
        return redirect(url_for("auth.login"))

    return render_template("register.html")


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password, password):
            flash("Invalid username or password")
            return redirect(url_for("auth.login"))

        access_token = create_access_token(identity={"username": user.username, "role": user.role})
        session["access_token"] = access_token
        session["username"] = user.username
        session["role"] = user.role
        session["user_id"] = user.id
        session["show_welcome_toast"] = True
        if user.role == "admin":
            return redirect(url_for("admin_panel.dashboard"))
        return redirect(url_for("dashboard.dashboard"))

    return render_template("login.html")


@auth_bp.route("/profile")
@login_required
def profile():
    return redirect(url_for("auth.dietprofile"))


@auth_bp.route("/dietprofile")
@login_required
def dietprofile():
    user = User.query.filter_by(username=session["username"]).first()
    feeds = Feed.query.filter_by(user_id=user.id).all()
    return render_template("profile.html", user=user, feeds=feeds)


@auth_bp.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password, password) or user.role != "admin":
            flash("Invalid admin credentials")
            return redirect(url_for("auth.admin_login"))

        access_token = create_access_token(identity={"username": user.username, "role": user.role})
        session["access_token"] = access_token
        session["username"] = user.username
        session["role"] = user.role
        session["user_id"] = user.id
        session["show_welcome_toast"] = True
        return redirect(url_for("admin_panel.dashboard"))

    return render_template("admin/admin_login.html")


@auth_bp.route("/logout")
def logout():
    session.clear()
    flash("Logged out!")
    return redirect(url_for("auth.login"))
