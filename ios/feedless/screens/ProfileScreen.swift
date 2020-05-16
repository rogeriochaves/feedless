//
//  Profile.swift
//  feedless
//
//  Created by Rogerio Chaves on 15/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct ProfileScreen : View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var imageLoader : ImageLoader
    @State private var selection = 0

    func postsList() -> some View {
        if let ssbKey = context.ssbKey, let profile = profiles.profiles[ssbKey.id] {
            switch profile {
            case .loading:
                return AnyView(Text("Loading...")
                    .navigationBarTitle(Text("Profile")))
            case let .success(profile):
                return AnyView(PostsList(profile.posts)
                    .environmentObject(imageLoader)
                    .navigationBarTitle(Text(profile.profile.name ?? "Profile")))
            case let .error(message):
                return AnyView(Text(message)
                    .navigationBarTitle(Text("Profile")))
            }
        } else {
            return AnyView(Text("Loading...")
                .navigationBarTitle(Text("Profile")))
        }
    }

    var body: some View {
        postsList()
    }
}

struct Profile_Previews: PreviewProvider {
    static var previews: some View {
        ProfileScreen()
            .environmentObject(Samples.context())
            .environmentObject(Samples.profiles())
            .environmentObject(ImageLoader())
    }
}
