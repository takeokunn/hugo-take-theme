{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);
    in
      {
        devShells = forAllSystems (
          system:
          let
            pkgs = nixpkgs.legacyPackages.${system};
          in
            {
              default = pkgs.mkShell {
                packages = with pkgs; [ hugo ];
              };
            }
        );
      };
}
