# Debugging in Azure DevOps

In order to debug via Azure DevOps, you need to run the dev server using https. A self signed cert should be generated and trusted on your local system.

A self signed .crt and .key can be generated using the provided generate-cert.sh script.

After generating the cert, you must add the .crt to your trusted certificate store.

[Windows](https://docs.microsoft.com/en-us/skype-sdk/sdn/articles/installing-the-trusted-root-certificate)
[MacOS](https://readwriteexercise.com/posts/trust-self-signed-certificates-macos/)
[Linux](https://blog.nuvotex.de/adding-trusted-root-ca-certificates-on-linux/)

References:
[Generate a self signed cert with Open SSL](https://docs.microsoft.com/en-us/dotnet/core/additional-tools/self-signed-certificates-guide#with-openssl)
