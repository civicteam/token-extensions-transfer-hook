# Civic Pass Transfer Hook


## Notes to build

### If you see:

```platform-tools` 1.16: `cargo build-sbf` error: failed to run custom build command for `blake3 v1.4.0```

Do this: https://solana.stackexchange.com/a/6989

### If you see: 

```
package `time v0.3.25` cannot be built because it requires rustc 1.67.0 or newer, while the currently active rustc version is 1.66.1
```

Do this:
`cargo update -p time@0.3.25 --precise 0.3.23`