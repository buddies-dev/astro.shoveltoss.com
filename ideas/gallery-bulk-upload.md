# Gallery Bulk Upload Workflow

Create a one-command workflow for adding new gallery images without manually uploading each file to Cloudinary.

## Idea

Add a script such as:

```bash
npm run gallery:upload ./new-gallery
```

The script would:

- Upload every image in the provided local folder to Cloudinary.
- Place uploads in a dedicated Cloudinary folder, such as `shoveltoss.com/gallery-2026`.
- Use readable filenames where possible with `use_filename=true`.
- Collect the resulting secure Cloudinary URLs.
- Append those URLs to `public/images.json` under the `gallery` array.
- Optionally place newest images first.

## Notes

- Use the Cloudinary CLI `upload_dir` command or the Cloudinary Node SDK.
- Keep Cloudinary credentials in local environment variables only.
- Do not commit API keys or secrets.
- This would make future gallery updates a one-command workflow instead of a manual upload process.
