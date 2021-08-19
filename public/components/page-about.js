export const mount = (app) => app.component('page-about', {
  template: `
    <h5>Description</h5>
    <p class="card-text">
    This app allows you to split your secret data into multiple <strong>shares</strong> using
    <a href="https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing" target="_blank">Shamir's Secret Sharing
      algorithm</a>.
    </p>
    <p>
    Your secret data is encrypted using <strong>AES-256 GCM</strong> cypher with randomly chosen 128bit key
    and 128bit IV which are then distributed within <strong>shares</strong>.
    </p>
    <p>
    <strong>Quorum</strong> defines the minimum amount of shares required to reconstruct secret data.
    </p>
    <h5 class="mt-4">Pseudo code</h5>

    <pre style="white-space: pre-line"><code>id = randomBytes(4)
      key = randomBytes(16)
      iv = randomBytes(16)
      cyphertext = AES256GCM(secretData, key, iv)
      payload = key + iv + cyphertext;
      shares = Shamir(payload, numShares, numQuorum)
      share(n) = base62(n + id + shares[n])
    </code></pre>

    <h5 class="mt-4">Constraints</h5>

    <pre style="white-space: pre-line"><code>0 &lt; n &lt; 256, n = [1..numShares], 0 &lt; numQuorum &lt;= numShares
      n = 1 byte, id = 4 bytes, key = 16 bytes, iv = 16 bytes, cyphertext = variable
    </code></pre>

    <p class="mt-5">Source code can be found on <a href="https://github.com/rainder/shamir"
                                                   target="_blank">GitHub</a>.</p>
  `,
});
