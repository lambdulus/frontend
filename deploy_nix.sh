#!/usr/bin/env bash

# backup original package.json
cp package.json package.old.json

# get current build-version
BUILD_VERSION="$(date +'%Y')-$(date +'%m')-$(date +'%d')"

# replaces placeholder in homepage field with current build-version
sed -i "s/@BUILD-VERSION/$BUILD_VERSION/g" package.json

# just to be sure
rm -rf build*

# run react-scripts build
npm run build

# move the built app to the versioned sub-dir
mv build/* "docs/build/$BUILD_VERSION/"

# clean behind myself
rm package.json
mv package.old.json package.json



# now to build to the root url for easier acces to the latest build

# backup original package.json
cp package.json package.old.json

# replaces placeholder in homepage field with nothing
sed -i s/@BUILD-VERSION//g package.json

# just to be sure
rm -rf build*

# run react-scripts build
npm run build

# removes all files of latest build but leaves all the older versions intact
rm -rf docs/!("build")

# move the built app to the root of the docs directory
mv build/* docs/

# clean behind myself
rm package.json
mv package.old.json package.json


echo ""
echo "BUILD WENT OK - EVERYTHING DONE"
echo ""