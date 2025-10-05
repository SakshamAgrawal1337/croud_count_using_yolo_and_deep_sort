from flask import Blueprint, render_template, session
from helpers import login_required
from models import User

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/dashboard")
@login_required
def dashboard():
    user = User.query.filter_by(username=session["username"]).first()
    return render_template("dashboard.html", user=user)

@dashboard_bp.route("/analysis_preview")
@login_required
def analysis_preview():
    user = User.query.filter_by(username=session["username"]).first()
    return render_template("analysis_preview.html", user=user)
