# Donations API — Image Upload

This endpoint allows users to create a donation and optionally upload an image (e.g., proof of payment, donor photo) that is stored in Cloudinary. The image URL is saved in the donation record.

## Endpoint

`POST /donations`

### Request (multipart/form-data)

- **Fields:**
  - `name` (string, required): Donor's name
  - `email` (string, required): Donor's email
  - `amount` (number, required): Donation amount
  - `purpose` (string, optional): Donation purpose
  - `image` (file, optional): Image file (max 5MB, jpg/png/webp)

### Example cURL

```
curl -X POST https://your-api-url/donations \
  -F "name=John Doe" \
  -F "email=john@example.com" \
  -F "amount=100" \
  -F "purpose=Charity" \
  -F "image=@/path/to/image.jpg"
```

### Response

```
{
  "id": "...",
  "name": "John Doe",
  "email": "john@example.com",
  "amount": 100,
  "purpose": "Charity",
  "ImageUrl": "https://res.cloudinary.com/.../image/upload/...jpg",
  "createdAt": "2026-04-13T12:34:56.789Z"
}
```

- If no image is uploaded, `ImageUrl` will be `null` or omitted.

### Notes for Frontend

- Use `multipart/form-data` for requests with images.
- The `image` field is optional.
- The returned `ImageUrl` is a direct Cloudinary link.
- Only image files are accepted (jpg, png, webp, etc.).
- Max file size: 5MB.

### Error Handling

- Invalid file types or files over 5MB will be rejected.
- All validation errors are returned as JSON with details.

---

For further questions, contact the backend team.
