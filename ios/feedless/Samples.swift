//
//  Samples.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

class Samples {
    static let sampleId = "@5e3FkSr1OEVb2TEMAYJYIgfT4KC9xpdLdIeDwjZQip4=.ed25519";

    static func context() -> Context {
        return Context(
            ssbKey: SSBKey(
                curve: "foo",
                publicKey: "bar",
                privateKey: "baz",
                id: sampleId
            ),
            status: .ready
        )
    }

    static func posts() -> Posts {
        return fullProfile().posts
    }

    static func profiles() -> Profiles {
        let profiles = Profiles()
        profiles.profiles[sampleId] = .success(fullProfile())

        return profiles
    }

    static func fullProfile() -> FullProfile {
        let path = Bundle.main.path(forResource: "fullProfile", ofType: "json")!
        let data = try! Data(contentsOf: URL(fileURLWithPath: path))

        return try! JSONDecoder().decode(FullProfile.self, from: data)
    }

    static func secrets() -> Secrets {
        let secrets = Secrets()
        secrets.secrets = .success(secretChats())

        return secrets
    }

    static func secretChats() -> [SecretChat] {
        let path = Bundle.main.path(forResource: "secrets", ofType: "json")!
        let data = try! Data(contentsOf: URL(fileURLWithPath: path))

        return try! JSONDecoder().decode([SecretChat].self, from: data)
    }

    static func communities() -> Communities {
        let communities = Communities()
        communities.communities["ssb-clients"] = .success(communityDetails())

        return communities
    }

    static func communityDetails() -> CommunityDetails {
        let path = Bundle.main.path(forResource: "communityDetails", ofType: "json")!
        let data = try! Data(contentsOf: URL(fileURLWithPath: path))

        return try! JSONDecoder().decode(CommunityDetails.self, from: data)
    }

    static func search() -> Search {
        let search = Search()
        search.results = .success(searchResults())

        return search
    }

    static func searchResults() -> SearchResults {
        let path = Bundle.main.path(forResource: "search", ofType: "json")!
        let data = try! Data(contentsOf: URL(fileURLWithPath: path))

        return try! JSONDecoder().decode(SearchResults.self, from: data)
    }
}
