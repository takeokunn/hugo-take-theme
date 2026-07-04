{
  description = "hugo-take-theme - Hugo theme for takeokunn.org";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            hugo
            nodejs_24
          ];
        };

        packages = {
          # The theme itself, consumable as `themesDir` input by other flakes
          default = pkgs.stdenvNoCC.mkDerivation {
            name = "hugo-take-theme";
            src = self;
            dontBuild = true;
            installPhase = ''
              mkdir -p $out
              cp -r assets i18n layouts static theme.toml LICENSE $out/
            '';
          };

          # Rendered exampleSite - doubles as a template regression test
          example-site = pkgs.stdenvNoCC.mkDerivation {
            name = "hugo-take-theme-example-site";
            src = self;
            nativeBuildInputs = [ pkgs.hugo ];
            buildPhase = ''
              export HUGO_CACHEDIR="$TMPDIR/hugo-cache"
              mkdir -p "$TMPDIR/themes"
              ln -s "$PWD" "$TMPDIR/themes/hugo-take-theme"
              cd exampleSite
              hugo --themesDir "$TMPDIR/themes" --theme hugo-take-theme --destination "$out" --printPathWarnings
            '';
            dontInstall = true;
          };
        };

        checks = {
          example-site = self.packages.${system}.example-site;
        };
      }
    );
}
