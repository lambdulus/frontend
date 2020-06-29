#!/usr/bin/env bash

# backup original package.json
cp package.json package.old.json

# get current build-version
BUILD_VERSION="$(date +'%Y')-$(date +'%m')-$(date +'%d')"

# replaces placeholder in homepage field with current build-version
sed -i "s/@BUILD-VERSION/build\/$BUILD_VERSION/g" package.json

# just to be sure
rm -rf build*

# run react-scripts build
npm run build

# create versioned directory in the build dir
mkdir "docs/build/$BUILD_VERSION"

# copy the built app to the versioned sub-dir
cp -rp build/* "docs/build/$BUILD_VERSION/"

# clean behind myself
rm -rf build/*
rm package.json
mv package.old.json package.json

echo ""
echo "Half-way through! Hold on!"
echo ""

# now to build to the root url for easier acces to the latest build

# backup original package.json
cp package.json package.old.json

# replaces placeholder in homepage field with nothing
sed -i s/@BUILD-VERSION//g package.json

# just to be sure
rm -rf build*

# run react-scripts build
npm run build

# copy the built app to the root of the docs directory
cp -rp build/* docs/

# clean behind myself
rm -rf build/*
rm package.json
mv package.old.json package.json


echo ""
echo "BUILD WENT OK - EVERYTHING DONE"
echo ""


# finally - commit and push
echo "Commiting and Pushing to the Upstream"
git commit -m "deploy build ver. $BUILD_VERSION"
git push