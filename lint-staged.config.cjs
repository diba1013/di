module.exports = {
	"*.{js,ts,json,yaml,yml}": ["prettier --ignore-unknown --write", "eslint --fix --cache"],
};
