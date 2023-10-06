module.exports = {
	"*.{js,cjs,ts,json,yaml,yml}": ["prettier --ignore-unknown --write --cache", "eslint --fix --cache"],
};
