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
        let path = Bundle.main.path(forResource: "sample", ofType: "json")!
        let data = try! Data(contentsOf: URL(fileURLWithPath: path))

        return try! JSONDecoder().decode(FullProfile.self, from: data)
    }
}
