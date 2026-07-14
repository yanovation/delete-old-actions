# Release a new version

> **Deprecated.** This project is no longer maintained and should not receive new releases. Releases now
> happen in [yanovian/delete-old-actions](https://github.com/yanovian/delete-old-actions). The steps below
> are kept for historical reference only.

Check the current version:
```bash
git tag --list --sort=-v:refname | head -n 1
```

Create a tag and push it to the release branch:
```bash
# Update the version before running the command
RELEASE_VERSION="v1.0.0"
git tag "${RELEASE_VERSION}" -m "Minor release: ${RELEASE_VERSION}"
git push origin "${RELEASE_VERSION}"
```

Then move the major version tag (for example v1) to point to the Git ref of the current release:

```bash
git tag -fa v1 -m "Major release: v1"
git push origin v1 --force
```

Then remember to push to Github Marketplace by releasing manually from the GUI.
