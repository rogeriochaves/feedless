git remote rm heroku || 1
git remote add heroku https://git.heroku.com/mighty-wildwood-12743.git
git subtree push --prefix app heroku master