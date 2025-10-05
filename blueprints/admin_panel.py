from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from models import db, User, Feed
from werkzeug.security import generate_password_hash
from helpers import login_required
import json

admin_panel_bp = Blueprint("admin_panel", __name__, url_prefix="/admin")

@admin_panel_bp.before_request
@login_required
def require_admin():
    if session.get("role") != "admin":
        flash("Access denied")
        return redirect(url_for("auth.login"))

@admin_panel_bp.route("/")
def dashboard():
    user_count = User.query.count()
    feed_count = Feed.query.count()
    return render_template("admin/admin_dashboard.html", user_count=user_count, feed_count=feed_count)

@admin_panel_bp.route("/users")
def users():
    users = User.query.all()
    return render_template("admin/admin_users.html", users=users)

@admin_panel_bp.route("/users/add", methods=["GET", "POST"])
def add_user():
    if request.method == "POST":
        username = request.form.get("username")
        first_name = request.form.get("first_name")
        last_name = request.form.get("last_name")
        email = request.form.get("email")
        password = request.form.get("password")
        role = request.form.get("role", "user")

        if User.query.filter_by(username=username).first() or User.query.filter_by(email=email).first():
            flash("Username or email already exists")
            return redirect(url_for("admin_panel.add_user"))

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
        flash("User added successfully")
        return redirect(url_for("admin_panel.users"))

    return render_template("admin/admin_add_user.html")

@admin_panel_bp.route("/users/edit/<int:user_id>", methods=["GET", "POST"])
def edit_user(user_id):
    user = User.query.get_or_404(user_id)
    if request.method == "POST":
        user.username = request.form.get("username")
        user.first_name = request.form.get("first_name")
        user.last_name = request.form.get("last_name")
        user.email = request.form.get("email")
        user.role = request.form.get("role")
        password = request.form.get("password")
        if password:
            user.password = generate_password_hash(password)
        db.session.commit()
        flash("User updated successfully")
        return redirect(url_for("admin_panel.users"))

    return render_template("admin/admin_edit_user.html", user=user)

@admin_panel_bp.route("/users/delete/<int:user_id>")
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    flash("User deleted successfully")
    return redirect(url_for("admin_panel.users"))

@admin_panel_bp.route("/feeds")
def feeds():
    feeds = Feed.query.all()
    return render_template("admin/admin_feeds.html", feeds=feeds)

@admin_panel_bp.route("/feeds/add", methods=["GET", "POST"])
def add_feed():
    users = User.query.all()
    if request.method == "POST":
        name = request.form.get("name")
        type_ = request.form.get("type")
        user_id = request.form.get("user_id") or None

        video_filename = None
        if type_ == "video":
            video_file = request.files.get("video_file")
            if video_file and video_file.filename != '':
                if not video_file.mimetype.startswith('video/'):
                    flash("Invalid file type. Please upload a video file.")
                    return redirect(url_for("admin_panel.add_feed"))
                # Save the video file to a directory (e.g., static/videos)
                import os
                upload_folder = os.path.join(os.getcwd(), "static", "videos")
                os.makedirs(upload_folder, exist_ok=True)
                video_filename = video_file.filename
                video_path = os.path.join(upload_folder, video_filename)
                video_file.save(video_path)
            else:
                flash("Please upload a video file for video type feed.")
                return redirect(url_for("admin_panel.add_feed"))

        new_feed = Feed(
            name=name,
            type=type_,
            video_filename=video_filename,
            user_id=user_id,
        )
        db.session.add(new_feed)
        db.session.commit()
        flash("Feed added successfully")
        return redirect(url_for("admin_panel.feeds"))

    return render_template("admin/admin_add_feed.html", users=users)

@admin_panel_bp.route("/feeds/edit/<int:feed_id>", methods=["GET", "POST"])
def edit_feed(feed_id):
    feed = Feed.query.get_or_404(feed_id)
    users = User.query.all()
    if request.method == "POST":
        feed.name = request.form.get("name")
        feed.type = request.form.get("type")
        feed.user_id = request.form.get("user_id") or None

        if feed.type == "video":
            video_file = request.files.get("video_file")
            if video_file and video_file.filename != '':
                if not video_file.mimetype.startswith('video/'):
                    flash("Invalid file type. Please upload a video file.")
                    return redirect(url_for("admin_panel.edit_feed", feed_id=feed_id))
                import os
                upload_folder = os.path.join(os.getcwd(), "static", "videos")
                os.makedirs(upload_folder, exist_ok=True)
                video_filename = video_file.filename
                video_path = os.path.join(upload_folder, video_filename)
                video_file.save(video_path)
                feed.video_filename = video_filename
            # If no new file uploaded, keep existing filename
        else:
            feed.video_filename = None

        db.session.commit()
        flash("Feed updated successfully")
        return redirect(url_for("admin_panel.feeds"))

    return render_template("admin/admin_edit_feed.html", feed=feed, users=users)

@admin_panel_bp.route("/feeds/delete/<int:feed_id>")
def delete_feed(feed_id):
    feed = Feed.query.get_or_404(feed_id)
    db.session.delete(feed)
    db.session.commit()
    flash("Feed deleted successfully")
    return redirect(url_for("admin_panel.feeds"))
