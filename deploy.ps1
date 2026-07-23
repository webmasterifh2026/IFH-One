npm run build
npm run test --passWithNoTests
git checkout develop
git add .
git commit -m "fix(build): resolve dependency version issue for IFH One v2.5.5"
git push origin develop
git checkout main
git pull origin main
git merge develop -m "IFH One v2.5.5 Final Build"
git push origin main
git checkout develop
git merge main
git push origin develop
echo "ALL DEPLOYMENT STEPS COMPLETED"
