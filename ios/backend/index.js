console.log("Loading nodejs");

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const posts = [
{"key":"%PvT5scAQqPNiVaoYUoz5Omdx3+ds6lLEKp79Kwm02Kc=.sha256","value":{"previous":"%IU4a9V1ieToeUE2SXoqQXH0DMI0/alvxoEkGFjhoZeY=.sha256","sequence":389,"author":"@mfY4X9Gob0w2oVfFv+CpX56PfL0GZ2RNQkc51SJlMvc=.ed25519","timestamp":1588479011745,"hash":"sha256","content":{"type":"post","root":"%RRIlEQi1Mo75X5pKdJ5HOnxRU+4n2bclwIDqiLpCWf0=.sha256","branch":"%RRIlEQi1Mo75X5pKdJ5HOnxRU+4n2bclwIDqiLpCWf0=.sha256","reply":{"%RRIlEQi1Mo75X5pKdJ5HOnxRU+4n2bclwIDqiLpCWf0=.sha256":"@EaYYQo5nAQRabB9nxAn5i2uiIZ665b90Qk2U/WHNVE8=.ed25519"},"channel":null,"recps":null,"text":"This is very cool. I sometimes get mantis pods to eat pests in the garden or on our fruit trees. \n\nIt's good that you noticed that they hatched - supposedly they'll start eating each other if you leave them unattended for too long. Then I think the last one standing is the boss you have to fight to level up.\n\nIt's always so weird and cool to see them so small and in such huge numbers.","mentions":[]},"signature":"y5ixxWK/Z7R+8q7FbgImgQWKQJ+HZXqyOi9HXNPr2m8BvOHXV2zFPt/scz7Eq+1Sn1eCi7WFYK2pL+2Xk4wmCw==.sig.ed25519"},"timestamp":1588479014165,"rts":1588479011745},
{"key":"%bpmnlkq5tf5GLhV4gt8z8rZ8gsvIE55+KpRZomWug6o=.sha256","value":{"previous":"%KlYtnEt6tnVzCdjVxkye/Yy+P2Tuu7/pORBjxqvpa4M=.sha256","sequence":17384,"author":"@+oaWWDs8g73EZFUMfW37R/ULtFEjwKN/DczvdYihjbU=.ed25519","timestamp":1588466897752,"hash":"sha256","content":{"type":"post","text":"[@Powersource](@Vz6v3xKpzViiTM/GAe+hKkACZSqrErQQZgv4iqQxEn8=.ed25519)\r\n\r\nIt depends on the implementation, but I'd expect that mentions won't work unless the client specifically supports your message type.","mentions":[{"link":"@Vz6v3xKpzViiTM/GAe+hKkACZSqrErQQZgv4iqQxEn8=.ed25519","name":"Powersource"}],"root":"%jK2xn0GE975NzHfAridPvdraqDx3dM60i9UVL7JRSiE=.sha256","branch":["%1O8ZJGxOnhZ624m1nMYM57xLv3LqPDCF/q9DedaPlRc=.sha256","%nrrnKl8YJQYHWmyEjTJevOJdb7/3wcNLKoLG+z2S00c=.sha256"]},"signature":"winljHJAxDLAvRa0uc0nYQvtDh3czkHCVvzKQ+eMH+tV07EGY16z947JZ2X+djctkI6baYpaWkpezXGXc87nAg==.sig.ed25519"},"timestamp":1588466900188,"rts":1588466897752}
]

app.get("/posts", (req, res) => {
    res.json(posts);
});

const expressServer = app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
